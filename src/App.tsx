import React, { useState, useEffect, useRef, useMemo, FormEvent } from "react";
import QRCode from "qrcode";
import {
  Building2,
  ShieldCheck,
  Send,
  AlertTriangle,
  History,
  CheckCircle,
  Activity,
  ArrowRight,
  Info,
  DollarSign,
  Lock,
  Search,
  Zap,
  RefreshCw,
  Clock,
  Filter,
  ArrowUpDown,
  Mail,
  Smartphone,
  Settings,
  Download,
  Trash2,
  HelpCircle,
  FileSpreadsheet,
  QrCode,
  Users,
  UserCheck,
  BarChart3,
  TrendingUp,
  PieChart as LucidePieChart
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

interface VerificationDetails {
  bankName: string;
  headquarters: string;
  network: "FedWire" | "FedACH" | "Real-Time Payments (RTP)" | "FedNow";
  instantVerifySupport: boolean;
  complianceLevel: string;
}

interface SimulatedTx {
  traceId: string;
  recipientName: string;
  amount: number;
  routing: string;
  account: string;
  senderAccount: string;
  status: "Completed (FedNow)" | "Completed (FedACH)" | "Blocked (Risk Override)";
  time: string;
  timestamp: number;
  complianceReason: string;
}

interface SavedBankAccount {
  id: string;
  bankName: string;
  routing: string;
  account: string;
  balance: number;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  securityQuestion: string;
  securityAnswer: string;
  savedAccounts: SavedBankAccount[];
}

export default function App() {
  // Profiles and Saved Bank accounts Database state
  const [profiles, setProfiles] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem("oasis_profiles");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback to defaults
      }
    }
    return [
      {
        id: "prof_1",
        name: "Jeffries BJ",
        email: "jeffriesbj1089@gmail.com",
        phone: "+1 (555) 902-1089",
        securityQuestion: "What was the city of your first bank branch open?",
        securityAnswer: "New York",
        savedAccounts: [
          {
            id: "acc_11",
            bankName: "Oasis Savings & Reserve",
            routing: "021000021",
            account: "5540918274",
            balance: 12450.80
          },
          {
            id: "acc_12",
            bankName: "Capital One Trust Link",
            routing: "051400549",
            account: "8827490192",
            balance: 4500.00
          }
        ]
      },
      {
        id: "prof_2",
        name: "Sarah Jenkins",
        email: "sarah@jenkins.org",
        phone: "+1 (415) 332-1188",
        securityQuestion: "What is the official brand of your primary bank?",
        securityAnswer: "Sovereign Blue",
        savedAccounts: [
          {
            id: "acc_21",
            bankName: "Wells Fargo Sovereign Select",
            routing: "121000248",
            account: "3318249019",
            balance: 250000.00
          }
        ]
      }
    ];
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    const saved = localStorage.getItem("oasis_active_profile_id");
    return saved || "prof_1";
  });

  // Profile creation states
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileEmail, setNewProfileEmail] = useState("");
  const [newProfilePhone, setNewProfilePhone] = useState("");
  const [newProfileQuestion, setNewProfileQuestion] = useState("What was the city of your first bank branch open?");
  const [newProfileAnswer, setNewProfileAnswer] = useState("");
  const [showProfileCreateForm, setShowProfileCreateForm] = useState(false);

  // Bank Account creation states
  const [newAccName, setNewAccName] = useState("");
  const [newAccRouting, setNewAccRouting] = useState("");
  const [newAccAccount, setNewAccAccount] = useState("");
  const [newAccBalance, setNewAccBalance] = useState("12000.00");
  const [showAccCreateForm, setShowAccCreateForm] = useState(false);

  // Sync profile details to LocalStorage
  useEffect(() => {
    localStorage.setItem("oasis_profiles", JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem("oasis_active_profile_id", activeProfileId);
  }, [activeProfileId]);

  // Input fields for current transaction
  const [routingNumber, setRoutingNumber] = useState("021000021");
  const [accountNumber, setAccountNumber] = useState("4091827490");
  const [amount, setAmount] = useState("4500.00");
  const [recipient, setRecipient] = useState("Jane Doe");
  const [senderAccount, setSenderAccount] = useState("Primary Treasury Link (***9021)");

  // Lookup API response state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    error?: string;
    details: VerificationDetails | null;
    source?: string;
  } | null>(null);

  // Bank Logo Generation state
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [generatedLogoUrl, setGeneratedLogoUrl] = useState<string | null>(null);
  const [logoSource, setLogoSource] = useState<string | null>(null);

  // Dynamic QR Code states
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [qrCodeActiveDetails, setQrCodeActiveDetails] = useState<string>("");
  const [qrCodeError, setQrCodeError] = useState<string | null>(null);
  const [auditMemo, setAuditMemo] = useState<string>("");

  // Friends & Family verification bypass state
  const [bypassVerificationForFriendsFamily, setBypassVerificationForFriendsFamily] = useState(false);

  // Audio playback throttling
  const lastRegenSoundTime = useRef(0);

  const playFeedbackSound = (type: "regen" | "download") => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (type === "regen") {
        // Enforce throttle (at most once every 500ms) to ensure sleek typing doesn't overlap sound
        const nowMs = Date.now();
        if (nowMs - lastRegenSoundTime.current < 500) return;
        lastRegenSoundTime.current = nowMs;

        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Sleek micro-tap / clean digital trigger beep for active dynamic sync reload
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, ctx.currentTime); // A5-ish sharp sweet tone
        osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.02, ctx.currentTime); // Extremely low & professional, pure indicator
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === "download") {
        const ctx = new AudioContextClass();
        // Rich high-fidelity sweep chime: plays a beautiful upward chord: Center-stage success chime
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (Soprano C Major sweep!)
        
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = "triangle"; // Rounder, softer vintage success aesthetic
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          
          gain.gain.setValueAtTime(0.04, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.18);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.18);
        });
      }
    } catch (err) {
      console.warn("AudioContext initiation blocked or not supported by client environment: ", err);
    }
  };

  // Available Balance Simulator State
  const [availableBalance, setAvailableBalance] = useState<number>(() => {
    const saved = localStorage.getItem("oasis_available_balance");
    return saved ? parseFloat(saved) : 12450.80;
  });

  useEffect(() => {
    localStorage.setItem("oasis_available_balance", availableBalance.toString());
  }, [availableBalance]);

  // MFA settings (customizable via layout panel)
  const [mfaEmail, setMfaEmail] = useState("jeffriesbj1089@gmail.com");
  const [mfaSMS, setMfaSMS] = useState("+1 (555) 902-1089");
  const [securityQuestion, setSecurityQuestion] = useState("What was the city of your first bank branch open?");
  const [securityAnswer, setSecurityAnswer] = useState("New York");

  // Synchronize MFA parameters dynamically when active profile shifts
  useEffect(() => {
    const activeProfile = profiles.find((p) => p.id === activeProfileId);
    if (activeProfile) {
      setMfaEmail(activeProfile.email);
      setMfaSMS(activeProfile.phone);
      setSecurityQuestion(activeProfile.securityQuestion);
      setSecurityAnswer(activeProfile.securityAnswer);
    }
  }, [activeProfileId, profiles]);

  // MFA Challenge State
  const [showMfaChallenge, setShowMfaChallenge] = useState(false);
  const [selectedMfaMethod, setSelectedMfaMethod] = useState<"otp_email" | "otp_sms" | "security_question">("otp_email");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [mfaInput, setMfaInput] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaSuccessMsg, setMfaSuccessMsg] = useState("");
  const [otpSentNotification, setOtpSentNotification] = useState("");
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Simulation run state
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferLogs, setTransferLogs] = useState<string[]>([]);
  const [transferSuccess, setTransferSuccess] = useState<boolean | null>(null);
  const [transferTrace, setTransferTrace] = useState<string>("");

  // Ledger Search / Filtering State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [amountFilter, setAmountFilter] = useState("All");
  const [sortBy, setSortBy] = useState("date-desc");

  // Success Confirmation Notification
  const [feedbackNotification, setFeedbackNotification] = useState<string | null>(null);

  // Past Transfer State (with LocalStorage Sync)
  const [pastTransfers, setPastTransfers] = useState<SimulatedTx[]>(() => {
    const local = localStorage.getItem("oasis_transfers_history");
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        // Fallback
      }
    }
    return [
      {
        traceId: "TRX-8274591",
        recipientName: "Apex Logistics LLC",
        amount: 4500.00,
        routing: "021000021",
        account: "*********4890",
        senderAccount: "Primary Treasury Link (***9021)",
        status: "Completed (FedNow)",
        time: "Jun 11, 2026, 05:45 PM",
        timestamp: Date.now() - 7200000, // 2 hours ago
        complianceReason: "Nacha anti-fraud score: 12 (Safe Level)"
      },
      {
        traceId: "TRX-3118249",
        recipientName: "Secure Escrow Solutions",
        amount: 154000.00,
        routing: "121000248",
        account: "*********3112",
        senderAccount: "Primary Treasury Link (***9021)",
        status: "Blocked (Risk Override)",
        time: "Jun 10, 2026, 11:20 AM",
        timestamp: Date.now() - 86400000, // 1 day ago
        complianceReason: "Large wire volume: standard micro-deposit bypass state unauthorized."
      },
      {
        traceId: "TRX-4209182",
        recipientName: "Sarah Jenkins",
        amount: 1200.00,
        routing: "051400549",
        account: "*********9203",
        senderAccount: "Primary Treasury Link (***9021)",
        status: "Completed (FedNow)",
        time: "Jun 09, 2026, 02:15 PM",
        timestamp: Date.now() - 172800000, // 2 days ago
        complianceReason: "Direct FedNow Instant Settle authorized."
      },
      {
        traceId: "TRX-1029481",
        recipientName: "Valverde Solar Grid",
        amount: 8750.00,
        routing: "021100268",
        account: "*********8192",
        senderAccount: "Corporate Float Balance (***4928)",
        status: "Completed (FedACH)",
        time: "Jun 08, 2026, 09:10 AM",
        timestamp: Date.now() - 259200000, // 3 days ago
        complianceReason: "Cleared via standard FedACH ledger sequence."
      }
    ];
  });

  // Synchronize localStorage
  useEffect(() => {
    localStorage.setItem("oasis_transfers_history", JSON.stringify(pastTransfers));
  }, [pastTransfers]);

  useEffect(() => {
    localStorage.setItem("oasis_available_balance", availableBalance.toString());
  }, [availableBalance]);

  // Handle instant bank lookup when routing changes (must be 9 digits for checksum)
  useEffect(() => {
    const clean = routingNumber.replace(/[^0-9]/g, "");
    if (clean.length === 9) {
      triggerVerification(clean);
    } else {
      setVerificationResult(null);
    }
  }, [routingNumber]);

  // Countdown for MFA simulated SMS or email code
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  // Dynamic QR Code Generation Effect with payload boundary checks
  useEffect(() => {
    setQrCodeError(null);
    let isMounted = true;

    try {
      const payloadObject = {
        app: "Oasis BankLink Direct Bypass",
        recipient: recipient || "Unspecified Recipient",
        amount: parseFloat(amount) || 0,
        routing: routingNumber || "",
        account: accountNumber || "",
        source: senderAccount,
        bypassSecurity: bypassVerificationForFriendsFamily ? "AUTHORIZED (Friends & Family)" : "MFA Required",
        auditMemo: auditMemo || undefined,
        date: new Date().toISOString()
      };

      const textPayload = JSON.stringify(payloadObject, null, 2);
      setQrCodeActiveDetails(textPayload);

      // 1. Check Scan Density Validation Warning (Optimal safe rendering size for level M QR Code scanners)
      const OPTIMAL_SCAN_LIMIT = 500;
      const HARD_QR_LIMIT = 1100;

      if (textPayload.length > HARD_QR_LIMIT) {
        setQrCodeError(`Payload Error: The current data contains ${textPayload.length} characters, exceeding the maximum safe standard limit of ${HARD_QR_LIMIT} characters. Simplification required to prevent scanner parse failure.`);
        setQrCodeDataUrl("");
        return;
      } else if (textPayload.length > OPTIMAL_SCAN_LIMIT) {
        setQrCodeError(`High Density Warning: Current payload (${textPayload.length} characters) exceeds the optimized mobile camera scanning threshold of ${OPTIMAL_SCAN_LIMIT} characters. Scan with steady lighting.`);
      }

      QRCode.toDataURL(textPayload, {
        width: 256,
        margin: 2,
        errorCorrectionLevel: "H", // High error correction level (30%) to ensure robustness with centered branding logo
        color: {
          dark: "#2d2d27", // Charcoal matching the theme
          light: "#faf9f5" // Muted warm off-white matching the theme
        }
      })
        .then((url) => {
          if (!isMounted) return;

          // Process canvas to overlay branding logo 'O' inside a green circle in the middle
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = url;
          img.onload = () => {
            if (!isMounted) return;
            try {
              const canvas = document.createElement("canvas");
              canvas.width = 256;
              canvas.height = 256;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                // 1. Draw standard background QR code
                ctx.drawImage(img, 0, 0, 256, 256);

                const center = 128;
                const size = 36; // Optimal logo size with plenty of margin at high error correction level

                // 2. Draw a clean, matching off-white background disc to block out standard QR modules
                ctx.fillStyle = "#faf9f5";
                ctx.beginPath();
                ctx.arc(center, center, (size / 2) + 3, 0, 2 * Math.PI);
                ctx.fill();

                // 3. Draw signature green circle
                ctx.fillStyle = "#7c8a60"; // Oasis signature green
                ctx.beginPath();
                ctx.arc(center, center, size / 2, 0, 2 * Math.PI);
                ctx.fill();

                // 4. Center the sleek white "O" letter precisely in the middle
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 20px 'Space Grotesk', 'Inter', sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("O", center, center);

                setQrCodeDataUrl(canvas.toDataURL());
                playFeedbackSound("regen");
              } else {
                setQrCodeDataUrl(url);
                playFeedbackSound("regen");
              }
            } catch (err) {
              console.error("Failed to render centered brand overlay, falling back to clean QR code.", err);
              setQrCodeDataUrl(url);
            }
          };

          img.onerror = () => {
            if (isMounted) {
              setQrCodeDataUrl(url);
            }
          };
        })
        .catch((err: any) => {
          if (isMounted) {
            console.error("Failed to generate QR Code image: ", err);
            setQrCodeError(`QR Builder Failure: ${err.message || "Invalid payload encoding parameters."}`);
            setQrCodeDataUrl("");
          }
        });
    } catch (tryErr: any) {
      console.error("QR Code execution context error caught: ", tryErr);
      setQrCodeError(`QR Boundary Catch: ${tryErr.message || "An unexpected error occurred during serialization."}`);
      setQrCodeDataUrl("");
    }

    return () => {
      isMounted = false;
    };
  }, [recipient, amount, routingNumber, accountNumber, senderAccount, bypassVerificationForFriendsFamily, auditMemo]);

  const fetchBankLogo = async (bankName: string) => {
    setIsGeneratingLogo(true);
    setGeneratedLogoUrl(null);
    setLogoSource(null);
    try {
      const res = await fetch("/api/generate-bank-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankName })
      });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        setGeneratedLogoUrl(data.imageUrl);
        setLogoSource(data.source || "Procedural Engine");
      }
    } catch (err) {
      console.error("Failed to generate bank logo:", err);
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  const triggerVerification = async (routing: string) => {
    setIsVerifying(true);
    setGeneratedLogoUrl(null);
    setLogoSource(null);
    try {
      const response = await fetch("/api/verify-routing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routingNumber: routing })
      });
      const data = await response.json();
      setVerificationResult(data);
      if (data.verified && data.details?.bankName) {
        fetchBankLogo(data.details.bankName);
      }
    } catch (err) {
      console.error(err);
      setVerificationResult({
        verified: false,
        error: "Server network timeout during bank verification.",
        details: null
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Check Federal Reserve Checksum formula
  const calculateOfflineChecksum = (routing: string) => {
    const clean = routing.replace(/[^0-9]/g, "");
    if (clean.length !== 9) return "Requires 9 digits";
    const d = clean.split("").map(Number);
    const sum = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8]);
    const isValid = sum % 10 === 0;
    return isValid ? "Checksum Valid ✔" : "Invalid ABA Checksum ✖";
  };

  // Start Multi Factor Authorization Challange
  const handleSubmissionRequest = (e: FormEvent) => {
    e.preventDefault();
    if (!routingNumber || !accountNumber || !recipient || !amount) {
      alert("Please fill in all banking fields.");
      return;
    }
    if (parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
      alert("Please enter a valid amount.");
      return;
    }

    // Check if configuration bypasses standard identification for friends & family
    if (bypassVerificationForFriendsFamily) {
      showFlashFeedback("Bypassing Multi-Factor identification: Friends & Family Direct Settle Active ✔");
      executeMockTransfer();
      return;
    }

    // Enter Challenge Mode
    setShowMfaChallenge(true);
    setMfaInput("");
    setMfaError("");
    setMfaSuccessMsg("");
    setOtpSentNotification("");

    // Auto generate OTP code for simulation if OTP method is selected
    if (selectedMfaMethod !== "security_question") {
      generateOtpCode();
    }
  };

  const generateOtpCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setOtpSentNotification(`MFA Code "${code}" sent via simulation channel.`);
    setOtpCountdown(60);
    setMfaInput("");
  };

  const switchMfaMethod = (method: "otp_email" | "otp_sms" | "security_question") => {
    setSelectedMfaMethod(method);
    setMfaInput("");
    setMfaError("");
    setOtpSentNotification("");
    
    if (method !== "security_question") {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setOtpSentNotification(`MFA Code "${code}" sent via simulated ${method === "otp_email" ? "Email" : "SMS"}.`);
      setOtpCountdown(60);
    }
  };

  // Submit and verify MFA security answer or passcode
  const handleVerifyMfa = (e: FormEvent) => {
    e.preventDefault();
    setMfaError("");

    if (selectedMfaMethod === "security_question") {
      if (mfaInput.trim().toLowerCase() !== securityAnswer.trim().toLowerCase()) {
        setMfaError(`Incorrect Answer. Hint: Set answer in security configuration box. (Configured answer: "${securityAnswer}")`);
        return;
      }
    } else {
      if (mfaInput.trim() !== generatedOtp) {
        setMfaError("Incorrect Passcode. Match the generated simulation code exactly.");
        return;
      }
    }

    // MFA Succeeds
    setMfaSuccessMsg("✔ Identity Authenticated! Proceeding to clearance gateway...");
    setTimeout(() => {
      setShowMfaChallenge(false);
      executeMockTransfer();
    }, 1000);
  };

  // Execute the simulator engine via back-end mock APIs
  const executeMockTransfer = async () => {
    setIsTransferring(true);
    setTransferSuccess(null);
    setTransferLogs([]);

    try {
      const parsedAmount = parseFloat(amount);
      const response = await fetch("/api/simulate-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routingNumber,
          accountNumber,
          amount: parsedAmount,
          recipientName: recipient,
          routingVerifiedInput: verificationResult?.details?.network || "FedACH"
        })
      });

      const responseData = await response.json();

      let logPointer = 0;
      const interval = setInterval(() => {
        if (responseData.auditLogs && logPointer < responseData.auditLogs.length) {
          setTransferLogs((prev) => [...prev, responseData.auditLogs[logPointer]]);
          logPointer++;
        } else {
          clearInterval(interval);
          setTransferSuccess(responseData.success);
          setTransferTrace(responseData.traceId);
          setIsTransferring(false);

          const maskedAccount = accountNumber.length > 4 
            ? "*".repeat(accountNumber.length - 4) + accountNumber.slice(-4) 
            : accountNumber;

          const finalStatus = responseData.success 
            ? (responseData.fedNowEligible ? "Completed (FedNow)" : "Completed (FedACH)")
            : "Blocked (Risk Override)";

          // If transfer resolves successfully, update simulated available balance and synchronize with profiles
          if (responseData.success) {
            setAvailableBalance((prev) => {
              const nextBalance = Math.max(0, prev - parsedAmount);
              
              // If sender account name matches a saved account in active profile, deduct from it too!
              setProfiles((prevProfs) => prevProfs.map((p) => {
                if (p.id === activeProfileId) {
                  return {
                    ...p,
                    savedAccounts: p.savedAccounts.map((acc) => {
                      const searchStr = `${acc.bankName} (***${acc.account.slice(-4)})`;
                      if (senderAccount === searchStr) {
                        return { ...acc, balance: Math.max(0, acc.balance - parsedAmount) };
                      }
                      return acc;
                    })
                  };
                }
                return p;
              }));
              
              return nextBalance;
            });
          }

          const now = new Date();
          const timeString = now.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric"
          }) + ", " + now.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit"
          });

          const newTransaction: SimulatedTx = {
            traceId: responseData.traceId,
            recipientName: recipient,
            amount: parsedAmount,
            routing: routingNumber,
            account: maskedAccount,
            senderAccount: senderAccount,
            status: finalStatus as any,
            time: timeString,
            timestamp: Date.now(),
            complianceReason: responseData.riskMessage
          };

          setPastTransfers((prev) => [newTransaction, ...prev]);
          showFlashFeedback("Transaction posted to secure ledger.");
        }
      }, 350);

    } catch (err) {
      setTransferLogs(["[ERROR] Federal API response interrupted. Connection aborted."]);
      setIsTransferring(false);
    }
  };

  // Flash UI Alert Notification helper
  const showFlashFeedback = (msg: string) => {
    setFeedbackNotification(msg);
    setTimeout(() => {
      setFeedbackNotification(null);
    }, 4500);
  };

  const loadDemoBank = (routing: string) => {
    setRoutingNumber(routing);
    showFlashFeedback(`Demo state updated to routing code: ${routing}`);
  };

  // Delete single history log
  const handleDeleteTx = (traceId: string) => {
    if (window.confirm(`Permanently remove trace log "${traceId}" from local records?`)) {
      setPastTransfers((prev) => prev.filter((tx) => tx.traceId !== traceId));
      showFlashFeedback("Trace record deleted.");
    }
  };

  // Reset simulation state and clear history logs
  const handleResetStorage = () => {
    if (window.confirm("Restore ledger database back to default initial logs?")) {
      localStorage.removeItem("oasis_transfers_history");
      localStorage.removeItem("oasis_available_balance");
      setAvailableBalance(12450.80);
      // reload defaults
      setPastTransfers([
        {
          traceId: "TRX-8274591",
          recipientName: "Apex Logistics LLC",
          amount: 4500.00,
          routing: "021000021",
          account: "*********4890",
          senderAccount: "Primary Treasury Link (***9021)",
          status: "Completed (FedNow)",
          time: "Jun 11, 2026, 05:45 PM",
          timestamp: Date.now() - 7200000,
          complianceReason: "Nacha anti-fraud score: 12 (Safe Level)"
        },
        {
          traceId: "TRX-3118249",
          recipientName: "Secure Escrow Solutions",
          amount: 154000.00,
          routing: "121000248",
          account: "*********3112",
          senderAccount: "Primary Treasury Link (***9021)",
          status: "Blocked (Risk Override)",
          time: "Jun 10, 2026, 11:20 AM",
          timestamp: Date.now() - 86400000,
          complianceReason: "Large wire volume: standard micro-deposit bypass state unauthorized."
        }
      ]);
      showFlashFeedback("Simulation ledger reset completed.");
    }
  };

  // Add virtual credit simulated balance (deposit) to test larger amounts
  const handleSimulateDeposit = () => {
    setAvailableBalance((prev) => prev + 10000);
    showFlashFeedback("Simulated Credit: Credited +$10,000.00 to balance.");
  };

  // Apply search query, category filters, and sorters to the past dynamic transfers array
  const filteredTransfers = pastTransfers.filter((tx) => {
    // 1. Search filter: Match against TraceId, Recipient, Routing, and Compliance reason
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      tx.recipientName.toLowerCase().includes(query) ||
      tx.traceId.toLowerCase().includes(query) ||
      tx.routing.includes(query) ||
      tx.complianceReason.toLowerCase().includes(query) ||
      tx.senderAccount.toLowerCase().includes(query);

    // 2. Status category filter
    const matchesStatus = statusFilter === "All" || tx.status === statusFilter;

    // 3. Amount brackets filter
    let matchesAmount = true;
    if (amountFilter === "under-1000") {
      matchesAmount = tx.amount < 1000;
    } else if (amountFilter === "1000-10000") {
      matchesAmount = tx.amount >= 1000 && tx.amount <= 10000;
    } else if (amountFilter === "over-10000") {
      matchesAmount = tx.amount > 10000;
    }

    return matchesSearch && matchesStatus && matchesAmount;
  });

  // Apply sorting logic
  const sortedTransfers = [...filteredTransfers].sort((a, b) => {
    if (sortBy === "date-desc") {
      return b.timestamp - a.timestamp;
    }
    if (sortBy === "date-asc") {
      return a.timestamp - b.timestamp;
    }
    if (sortBy === "amount-desc") {
      return b.amount - a.amount;
    }
    if (sortBy === "amount-asc") {
      return a.amount - b.amount;
    }
    if (sortBy === "name-asc") {
      return a.recipientName.localeCompare(b.recipientName);
    }
    if (sortBy === "name-desc") {
      return b.recipientName.localeCompare(a.recipientName);
    }
    return 0;
  });

  // Collapsible state for analytics/trends section
  const [showAnalytics, setShowAnalytics] = useState(true);

  // Compute stats and series for charts
  const chartData = useMemo(() => {
    // Sort oldest first for progression trend over time
    const oldestToNewest = [...pastTransfers].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    
    // 1. Line/Area Chart Trend (Chronological Volume over Time)
    let cumulativeSum = 0;
    const trendPoints = oldestToNewest.map((tx, idx) => {
      cumulativeSum += tx.amount;
      let axisLabel = `Tx #${idx + 1}`;
      if (tx.time) {
        const match = tx.time.match(/([A-Za-z]+\s\d+)/); // e.g. "Jun 11"
        if (match) {
          axisLabel = match[1];
        }
      }
      return {
        id: tx.traceId,
        displayLabel: axisLabel,
        amount: tx.amount,
        cumulativeVolume: cumulativeSum,
        recipient: tx.recipientName,
        status: tx.status
      };
    });

    // 2. Status distribution for Pie/Bar Chart
    const statusDistribution = {
      completedFedNow: 0,
      completedFedACH: 0,
      blockedRisk: 0,
    };
    
    let totalCompletedVal = 0;
    let totalBlockedVal = 0;

    pastTransfers.forEach((tx) => {
      const amt = tx.amount;
      if (tx.status.includes("FedNow")) {
        statusDistribution.completedFedNow++;
        totalCompletedVal += amt;
      } else if (tx.status.includes("FedACH")) {
        statusDistribution.completedFedACH++;
        totalCompletedVal += amt;
      } else if (tx.status.includes("Blocked") || tx.status.includes("Risk")) {
        statusDistribution.blockedRisk++;
        totalBlockedVal += amt;
      }
    });

    const statusCounts = [
      { name: "FedNow Instant", count: statusDistribution.completedFedNow, color: "#7c8a60" },
      { name: "FedACH Standard", count: statusDistribution.completedFedACH, color: "#a1b285" },
      { name: "Blocked Risks", count: statusDistribution.blockedRisk, color: "#b91c1c" }
    ].filter(item => item.count > 0);

    const financialBreakdown = [
      { name: "Cleared", amount: totalCompletedVal, color: "#7c8a60" },
      { name: "Blocked", amount: totalBlockedVal, color: "#c2410c" }
    ];

    return {
      trendPoints,
      statusCounts,
      financialBreakdown,
      totals: {
        totalTxCount: pastTransfers.length,
        totalVolume: pastTransfers.reduce((acc, tx) => acc + tx.amount, 0),
        totalCleared: totalCompletedVal,
        totalBlocked: totalBlockedVal,
        successRatePercentage: pastTransfers.length > 0 
          ? Math.round(((statusDistribution.completedFedNow + statusDistribution.completedFedACH) / pastTransfers.length) * 100) 
          : 100
      }
    };
  }, [pastTransfers]);

  // Export logs helper (CSV emulation download)
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Trace ID,Sender Ledger,Recipient,Routing Number,Account Number,Amount (USD),Settle Type,Timestamp,Risk Outcome\n";
    
    pastTransfers.forEach((tx) => {
      csvContent += `"${tx.traceId}","${tx.senderAccount}","${tx.recipientName}","${tx.routing}","${tx.account}",${tx.amount},"${tx.status}","${tx.time}","${tx.complianceReason}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DirectBank_Ledger_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showFlashFeedback("CSV ledger log downloaded.");
  };

  return (
    <div className="min-h-screen bg-[#fdfcf8] text-[#3d3d35] flex flex-col font-sans antialiased selection:bg-[#7c8a60]/20">
      
      {/* Toast Feedback notifications */}
      {feedbackNotification && (
        <div className="fixed bottom-6 right-6 bg-[#2d2d27] text-[#ebdcc1] px-5 py-3.5 rounded-2xl border border-[#3d3d35] shadow-xl text-xs font-mono flex items-center gap-2 z-[9999] animate-bounce">
          <span className="w-2 h-2 rounded-full bg-[#7c8a60] animate-ping" />
          <span>{feedbackNotification}</span>
        </div>
      )}

      {/* Navigation Header */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-6 border-b border-[#e9e8e0] bg-[#fdfcf8] sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#7c8a60] rounded-xl flex items-center justify-center text-white font-bold italic font-serif text-lg">
            O
          </div>
          <div>
            <span className="text-xl font-semibold tracking-tight text-[#2d2d27] block leading-none">Oasis BankLink</span>
            <span className="text-[10px] text-[#7a7a6e] font-sans tracking-widest uppercase mt-0.5 block">DIRECT BYPASS PORTAL</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6 text-sm font-medium text-[#7a7a6e]">
          <span className="text-[#2d2d27] border-b-2 border-[#7c8a60] pb-1 cursor-default hidden md:inline">Verification DevConsole</span>
          <span className="hover:text-[#2d2d27] cursor-pointer hidden md:inline" onClick={() => {
            const el = document.getElementById("ledger-section");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}>Past Ledger Logs</span>
          
          <div className="flex items-center gap-2 bg-[#f0f4e8] text-[#7c8a60] px-3.5 py-1.5 rounded-full text-xs font-semibold border border-[#d2dec0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7c8a60] animate-pulse"></span>
            FedACH/FedNow Live
          </div>

          <div className="w-10 h-10 bg-[#e2e1d5] rounded-full overflow-hidden border-2 border-[#d3d2c6]">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User profile" referrerPolicy="no-referrer" />
          </div>
        </div>
      </nav>

      {/* Hero Header with Active Stats widgets */}
      <div className="bg-[#f7f6f0] border-b border-[#e9e8e0] py-8 px-6 sm:px-10">
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          
          <div className="space-y-2 max-w-2xl">
            <span className="px-3 py-1 bg-[#f0f4e8] text-[#7c8a60] text-[11px] font-bold rounded-full uppercase tracking-wider border border-[#d2dec0]">
              NACHA BYPASS STANDARD
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif text-[#2d2d27] italic">Instant Bank verification</h1>
            <p className="text-[#6b6b5f] text-sm leading-relaxed">
              Verify direct wire link status instantaneously using only Routing and Account integers. Eliminate multi-day micro-deposits, test cryptographic security questions, and monitor real-time audit logs in our compliance sandbox.
            </p>
          </div>

          {/* Core Interactive Simulation Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 shrink-0">
            <div className="bg-white p-4 rounded-2xl border border-[#e2e1d5] text-left">
              <span className="text-[10px] text-[#9a9a8c] block font-bold uppercase tracking-wider">Simulated Balance</span>
              <span className="text-lg font-serif italic text-[#2d2d27] block mt-1">${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <button onClick={handleSimulateDeposit} className="text-[10px] text-[#7c8a60] font-bold underline mt-1 block hover:text-[#2d2d27]">
                + Inject $10,000 Credit
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#e2e1d5] text-left">
              <span className="text-[10px] text-[#9a9a8c] block font-bold uppercase tracking-wider">MFA Protocol</span>
              <span className="text-xs font-semibold text-[#7c8a60] block mt-1 bg-[#f0f4e8] px-2 py-0.5 rounded-md border border-[#d2dec0] text-center capitalize">
                {selectedMfaMethod === "security_question" ? "Custom Question" : "OTP Code Active"}
              </span>
              <span className="text-[10px] text-[#8a8a7c] block mt-1">Multi-factor required</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#e2e1d5] text-left col-span-2 md:col-span-1">
              <span className="text-[10px] text-[#9a9a8c] block font-bold uppercase tracking-wider">Validation Rate</span>
              <span className="text-lg font-semibold text-[#2d2d27] block mt-1 font-mono">100% Secure</span>
              <span className="text-[10px] text-[#8a8a7c] block">Checksum lookup bypasses</span>
            </div>
          </div>

        </div>
      </div>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-10 py-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN (Form and Live Verification State / MFA Challenge Panel) - 7 span */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Quick Bank Presets Bar to Help Test Routing Validation Checksum */}
          <div className="bg-[#f9f9f6] p-5 rounded-2xl border border-[#e2e1d5]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#9a9a8c] block mb-3 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#7c8a60]" />
              Tap Routing Presets for instant federal match lookup:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => loadDemoBank("021000021")}
                className={`text-left px-3 py-2 bg-white rounded-xl border transition text-xs flex flex-col gap-0.5 cursor-pointer ${routingNumber === "021000021" ? "border-[#7c8a60] bg-[#f0f4e8]" : "border-[#e2e1d5] hover:border-[#7c8a60]"}`}
              >
                <span className="font-semibold text-[#2d2d27]">JPMorgan Chase, NA</span>
                <span className="font-mono text-[#7a7a6e]">021000021 (Valid)</span>
              </button>
              <button
                type="button"
                onClick={() => loadDemoBank("121000248")}
                className={`text-left px-3 py-2 bg-white rounded-xl border transition text-xs flex flex-col gap-0.5 cursor-pointer ${routingNumber === "121000248" ? "border-[#7c8a60] bg-[#f0f4e8]" : "border-[#e2e1d5] hover:border-[#7c8a60]"}`}
              >
                <span className="font-semibold text-[#2d2d27]">Wells Fargo Bank</span>
                <span className="font-mono text-[#7a7a6e]">121000248 (Valid)</span>
              </button>
              <button
                type="button"
                onClick={() => loadDemoBank("051400549")}
                className={`text-left px-3 py-2 bg-white rounded-xl border transition text-xs flex flex-col gap-0.5 cursor-pointer ${routingNumber === "051400549" ? "border-[#7c8a60] bg-[#f0f4e8]" : "border-[#e2e1d5] hover:border-[#7c8a60]"}`}
              >
                <span className="font-semibold text-[#7c8a60]">Capital One (FedNow)</span>
                <span className="font-mono text-[#7a7a6e]">051400549 (Valid)</span>
              </button>
            </div>
            <span className="text-[10px] text-[#8a8a7c] mt-2 block leading-none">
              * Any other 9-digit routing can be entered. If checksum matches, results fall back to Gemini-assisted bank lookup.
            </span>
          </div>

          {/* MAIN FORM PANEL */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#e2e1d5] shadow-xs relative">
            
            {/* CONDITIONAL MFA OVERLAY CHALLENGE */}
            {showMfaChallenge ? (
              <div className="bg-white rounded-2xl p-2 animate-fadeIn transition-all">
                <div className="flex items-center gap-3 border-b border-[#e9e8e0] pb-4 mb-4">
                  <div className="w-10 h-10 bg-[#f0f4e8] rounded-xl flex items-center justify-center text-[#7c8a60]">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-serif font-semibold text-[#2d2d27] italic">Multi-Factor Authentication Challenge</h2>
                    <p className="text-xs text-[#7a7a6e]">Bypass requires secondary confirmation of account holder identity</p>
                  </div>
                </div>

                {/* Simulated MFA Selector Tab list */}
                <div className="flex border-b border-[#e9e8e0] mb-5">
                  <button
                    type="button"
                    onClick={() => switchMfaMethod("otp_email")}
                    className={`flex-1 py-2 text-xs font-semibold border-b-2 text-center transition ${selectedMfaMethod === "otp_email" ? "border-[#7c8a60] text-[#7c8a60]" : "border-transparent text-[#7a7a6e] hover:text-[#2d2d27]"}`}
                  >
                    <Mail className="w-3.5 h-3.5 inline mr-1.5" />
                    Email Code
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMfaMethod("otp_sms")}
                    className={`flex-1 py-2 text-xs font-semibold border-b-2 text-center transition ${selectedMfaMethod === "otp_sms" ? "border-[#7c8a60] text-[#7c8a60]" : "border-transparent text-[#7a7a6e] hover:text-[#2d2d27]"}`}
                  >
                    <Smartphone className="w-3.5 h-3.5 inline mr-1.5" />
                    SMS Check
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMfaMethod("security_question")}
                    className={`flex-1 py-2 text-xs font-semibold border-b-2 text-center transition ${selectedMfaMethod === "security_question" ? "border-[#7c8a60] text-[#7c8a60]" : "border-transparent text-[#7a7a6e] hover:text-[#2d2d27]"}`}
                  >
                    <HelpCircle className="w-3.5 h-3.5 inline mr-1.5" />
                    Security Ques.
                  </button>
                </div>

                <form onSubmit={handleVerifyMfa} className="space-y-4">
                  
                  {/* SMS / EMAIL OTP SUB-WORKFLOW */}
                  {selectedMfaMethod !== "security_question" ? (
                    <div className="space-y-3">
                      <div className="p-4 bg-[#f9f9f6] rounded-xl border border-[#e2e1d5] text-xs space-y-2">
                        <div className="flex justify-between text-[#7a7a6e]">
                          <span>Verification Target:</span>
                          <span className="font-mono text-[#2d2d27] font-semibold">
                            {selectedMfaMethod === "otp_email" ? mfaEmail : mfaSMS}
                          </span>
                        </div>
                        {otpSentNotification && (
                          <div className="text-[11px] text-[#7c8a60] font-mono bg-[#f0f4e8] p-2.5 rounded-lg border border-[#d2dec0] flex items-center justify-between">
                            <span>{otpSentNotification}</span>
                            <span className="bg-[#7c8a60] text-white px-2 py-0.5 rounded text-[9px] font-bold">SIMULATION OTP</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[11px] text-[#7a7a6e] pt-1">
                          <span>Auto-Verification system simulated.</span>
                          <button
                            type="button"
                            onClick={generateOtpCode}
                            disabled={otpCountdown > 0}
                            className="text-[#7c8a60] font-bold underline cursor-pointer disabled:text-[#9a9a8c]"
                          >
                            {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : "Resend Passcode"}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-[#9a9a8c] mb-1.5">
                          Enter 6-Digit Temporary Passcode
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="e.g. 481029"
                          value={mfaInput}
                          onChange={(e) => setMfaInput(e.target.value.replace(/[^0-9]/g, ""))}
                          className="w-full bg-[#f9f9f6] border border-[#e2e1d5] rounded-xl px-4 py-3 text-lg font-mono text-center tracking-widest focus:ring-1 focus:ring-[#7c8a60] focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    /* SECURITY QUESTIONS SUB-WORKFLOW */
                    <div className="space-y-3">
                      <div className="p-4 bg-[#f9f9f6] rounded-xl border border-[#e2e1d5] text-xs text-slate-800">
                        <span className="text-[10px] text-[#9a9a8c] block uppercase tracking-wider font-bold mb-1">Simulated Question Challenge:</span>
                        <p className="font-serif italic text-sm text-[#2d2d27]">{securityQuestion}</p>
                        <span className="text-[10px] text-[#8a8a7c] mt-2 block italic text-center">
                          Answer previously configured in the "MFA Settings" box on the right.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-[#9a9a8c] mb-1.5">
                          Security Answer
                        </label>
                        <input
                          type="text"
                          placeholder="Provide the security answer here"
                          value={mfaInput}
                          onChange={(e) => setMfaInput(e.target.value)}
                          className="w-full bg-[#f9f9f6] border border-[#e2e1d5] rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-[#7c8a60] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {mfaError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span>{mfaError}</span>
                    </div>
                  )}

                  {mfaSuccessMsg && (
                    <div className="p-3 bg-[#f0f4e8] border border-[#d2dec0] text-[#7c8a60] text-xs font-bold rounded-lg flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>{mfaSuccessMsg}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowMfaChallenge(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl cursor-pointer text-xs"
                    >
                      Cancel Transfer
                    </button>
                    <button
                      type="submit"
                      disabled={!mfaInput}
                      className="flex-1 bg-[#7c8a60] hover:bg-[#6c7952] text-white font-bold py-3.5 rounded-2xl cursor-pointer text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Verify &amp; Clear Wire
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* STANDARD TRANSACTION PATH FORM */
              <form onSubmit={handleSubmissionRequest} className="space-y-6">
                
                <div className="flex items-center justify-between border-b border-[#e9e8e0] pb-3">
                  <span className="text-xs uppercase tracking-widest text-[#9a9a8c] font-bold">Instant Gateway Transfer Info</span>
                  <span className="text-[10px] text-[#7c8a60] bg-[#f0f4e8] px-2.5 py-0.5 rounded-md font-mono border border-[#d2dec0]">MFA ENABLED</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  
                  {/* Account Sender Select Mock */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#9a9a8c] mb-2.5">
                      Debiting Account Ledger (Authorized Owner)
                    </label>
                    <select
                      value={senderAccount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSenderAccount(val);
                        if (val === "Primary Treasury Link (***9021)") {
                          setAvailableBalance(12450.80);
                        } else if (val === "Corporate Float Balance (***4928)") {
                          setAvailableBalance(250000.00);
                        } else if (val === "Operating Operations Holding (***0192)") {
                          setAvailableBalance(4500.00);
                        } else {
                          const activeProf = profiles.find(p => p.id === activeProfileId);
                          if (activeProf) {
                            const matched = activeProf.savedAccounts.find(
                              (acc) => `${acc.bankName} (***${acc.account.slice(-4)})` === val
                            );
                            if (matched) {
                              setAvailableBalance(matched.balance);
                            }
                          }
                        }
                      }}
                      className="w-full bg-[#f9f9f6] border border-[#e2e1d5] rounded-2xl py-3 px-4 text-[#2d2d27] font-sans text-sm tracking-wide focus:outline-none focus:border-[#7c8a60] focus:ring-1 focus:ring-[#7c8a60]"
                    >
                      <option value="Primary Treasury Link (***9021)">Primary Treasury Link (***9021) - Balance: $12,450.80</option>
                      <option value="Corporate Float Balance (***4928)">Corporate Float Balance (***4928) - Balance: $250,000.00</option>
                      <option value="Operating Operations Holding (***0192)">Operating Operations Holding (***0192) - Balance: $4,500.00</option>
                      
                      {/* Dynamic Custom Bank Accounts */}
                      {profiles.find(p => p.id === activeProfileId)?.savedAccounts.map((acc) => {
                        const optionValue = `${acc.bankName} (***${acc.account.slice(-4)})`;
                        return (
                          <option key={acc.id} value={optionValue}>
                            {acc.bankName} (***{acc.account.slice(-4)}) - Balance: ${acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} [Profile: {profiles.find(p => p.id === activeProfileId)?.name}]
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Routing Input */}
                  <div className="group">
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#9a9a8c] mb-2.5">
                      Bank Routing Number (ABA)
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-4 w-5 h-5 text-[#9a9a8c]" />
                      <input
                        type="text"
                        maxLength={9}
                        placeholder="e.g. 021000021"
                        value={routingNumber}
                        onChange={(e) => setRoutingNumber(e.target.value.replace(/[^0-9]/g, ""))}
                        className="w-full bg-[#f9f9f6] border border-[#e2e1d5] rounded-2xl py-3.5 pl-12 pr-4 text-[#2d2d27] placeholder-[#a1a193] font-mono text-lg tracking-widest focus:outline-none focus:border-[#7c8a60] focus:ring-1 focus:ring-[#7c8a60] transition-colors"
                      />
                    </div>
                    {routingNumber.length > 0 && (
                      <div className="mt-2 flex justify-between text-xs font-mono">
                        <span className="text-[#7a7a6e]">Checksum Validation:</span>
                        <span className={routingNumber.length === 9 && calculateOfflineChecksum(routingNumber).includes("Valid") ? "text-[#7c8a60] font-bold" : "text-amber-700 font-medium"}>
                          {calculateOfflineChecksum(routingNumber)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Account Number Input */}
                  <div className="group">
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#9a9a8c] mb-2.5">
                      Recipient Account Number
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-4 w-5 h-5 text-[#9a9a8c]" />
                      <input
                        type="text"
                        placeholder="e.g. 4091827490"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ""))}
                        className="w-full bg-[#f9f9f6] border border-[#e2e1d5] rounded-2xl py-3.5 pl-12 pr-4 text-[#2d2d27] placeholder-[#a1a193] font-mono text-lg tracking-widest focus:outline-none focus:border-[#7c8a60] focus:ring-1 focus:ring-[#7c8a60] transition-colors"
                      />
                    </div>
                    <span className="text-[10px] text-[#8a8a7c] mt-1.5 block leading-normal">
                      Bypasses micro-deposits safely via direct ledger lookup matches.
                    </span>
                  </div>

                </div>

                {/* Dynamic Bank Verification Response panel */}
                {routingNumber.length === 9 && (
                  <div className={`p-5 rounded-2xl border transition-all ${verificationResult?.verified ? 'bg-[#f0f4e8] border-[#d2dec0] text-[#3d3d35]' : 'bg-[#fffbeb] border-[#fbebcf] text-[#3b3a30]'}`}>
                    {isVerifying ? (
                      <div className="flex items-center gap-3 text-[#7a7a6e] text-xs">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#7c8a60]" />
                        <span>Scanning Fed/ABA lookup databases recursively...</span>
                      </div>
                    ) : verificationResult ? (
                      <div>
                        {verificationResult.verified ? (
                          <div className="space-y-3">
                            <div className="flex gap-4 items-start">
                              {/* Logo Component */}
                              <div className="shrink-0">
                                {isGeneratingLogo ? (
                                  <div className="w-16 h-16 bg-[#e2e1d5]/40 rounded-2xl border border-[#e2e1d5] flex flex-col items-center justify-center text-[9px] text-[#7a7a6e] font-sans font-bold select-none p-1">
                                    <RefreshCw className="w-4 h-4 animate-spin mb-1 text-[#7c8a60]" />
                                    <span>Generating...</span>
                                  </div>
                                ) : generatedLogoUrl ? (
                                  <div className="relative group/logo">
                                    <img
                                      src={generatedLogoUrl}
                                      alt={`${verificationResult.details?.bankName} Brand Logo`}
                                      referrerPolicy="no-referrer"
                                      className="w-16 h-16 rounded-2xl border border-[#d2dec0] object-contain shadow-sm bg-white bg-opacity-90 transition duration-300 transform group-hover/logo:scale-105"
                                    />
                                    {logoSource && (
                                      <span className="absolute -bottom-1 -right-1 bg-[#2d2d27] text-[7px] text-white px-1.5 py-0.5 rounded-md uppercase font-mono shadow-xs">
                                        {logoSource.includes("Gemini") ? "AI Logo" : "Logo"}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="w-16 h-16 bg-[#e2e1d5]/20 rounded-2xl border border-[#e2e1d5] flex items-center justify-center text-xs text-[#9a9a8c]">
                                    <Building2 className="w-6 h-6" />
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 space-y-3">
                                <div className="flex items-center justify-between border-b border-[#e2e1d5]/50 pb-2">
                                  <span className="text-xs font-bold uppercase tracking-wider text-[#7c8a60] flex items-center gap-1.5">
                                    <CheckCircle className="w-4 h-4" /> Transit Identity Resolved
                                  </span>
                                  <span className="text-[10px] bg-white text-[#7c8a60] font-mono px-2 py-0.5 rounded border border-[#d2dec0]">
                                    {verificationResult.source}
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                                  <div>
                                    <span className="text-[#7a7a6e] block text-[10px] tracking-wide uppercase font-bold">Corporate Legal Match</span>
                                    <span className="font-semibold text-[#2d2d27] text-sm">{verificationResult.details?.bankName}</span>
                                  </div>
                                  <div>
                                    <span className="text-[#7a7a6e] block text-[10px] tracking-wide uppercase font-bold">Federal HQ Registry</span>
                                    <span className="text-[#2d2d27] text-sm">{verificationResult.details?.headquarters}</span>
                                  </div>
                                  <div>
                                    <span className="text-[#7a7a6e] block text-[10px] tracking-wide uppercase font-bold">Fulfillment Settle Route</span>
                                    <span className="font-mono text-[#7c8a60] uppercase">{verificationResult.details?.network} Network Link</span>
                                  </div>
                                  <div>
                                    <span className="text-[#7a7a6e] block text-[10px] tracking-wide uppercase font-bold">Nacha Tier Classification</span>
                                    <span className="text-[#2d2d27]">{verificationResult.details?.complianceLevel}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2.5 text-xs text-amber-850">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                            <div>
                              <span className="font-bold block text-amber-900">ABA Lookup Blocked</span>
                              <p className="text-[#7a7a6e] text-[11px] mt-0.5">
                                {verificationResult.error || "The routing number provided is mathematically invalid. Solve the ABA check sum first."}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  <div className="group">
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#9a9a8c] mb-2.5">
                      Recipient Full Legal Name
                    </label>
                    <div className="relative">
                      <History className="absolute left-4 top-4 w-5 h-5 text-[#9a9a8c]" />
                      <input
                        type="text"
                        placeholder="e.g. Jane Doe"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        className="w-full bg-[#f9f9f6] border border-[#e2e1d5] rounded-2xl py-3.5 pl-12 pr-4 text-[#2d2d27] placeholder-[#a1a193] focus:outline-none focus:border-[#7c8a60] transition-colors"
                      />
                    </div>
                  </div>

                  <div className="group">
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#9a9a8c] mb-2.5">
                      Transfer Amount (USD)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-4 w-5 h-5 text-[#7c8a60]" />
                      <input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-[#f9f9f6] border border-[#e2e1d5] rounded-2xl py-3.5 pl-12 pr-4 text-[#2d2d27] placeholder-[#a1a193] text-lg font-serif focus:outline-none focus:border-[#7c8a60] transition-colors font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Optional Transaction Memo with Character Count to aid testing QR validation */}
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#9a9a8c]">
                      Optional Transaction Memo / Reference
                    </label>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${auditMemo.length > 800 ? 'text-red-700 bg-red-50' : auditMemo.length > 250 ? 'text-amber-800 bg-amber-50' : 'text-[#7a7a6e]'}`}>
                      Memo Character Count: {auditMemo.length} chars
                    </span>
                  </div>
                  <div className="relative">
                    <FileSpreadsheet className="absolute left-4 top-3.5 w-5 h-5 text-[#9a9a8c]" />
                    <textarea
                      placeholder="Add compliance context, invoices, or personal statements here. Exceeding 250+ characters increases the scan density; 800+ chars triggers standard limit warning flags."
                      value={auditMemo}
                      onChange={(e) => setAuditMemo(e.target.value)}
                      rows={2}
                      maxLength={1100}
                      className="w-full bg-[#f9f9f6] border border-[#e2e1d5] rounded-2xl py-3 pl-12 pr-4 text-xs text-[#2d2d27] placeholder-[#a1a193] focus:outline-none focus:border-[#7c8a60] transition-colors resize-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* Friends & Family Verification Bypass Option */}
                <div className="p-4 bg-[#f0f4e8]/80 border border-[#d2dec0] rounded-2xl flex items-start gap-3 mt-2">
                  <div className="flex items-center h-5 mt-0.5">
                    <input
                      id="friends-family-bypass"
                      type="checkbox"
                      checked={bypassVerificationForFriendsFamily}
                      onChange={(e) => setBypassVerificationForFriendsFamily(e.target.checked)}
                      className="w-4 h-4 text-[#7c8a60] rounded border-[#d3d2c6] focus:ring-[#7c8a60] cursor-pointer"
                    />
                  </div>
                  <div className="text-xs">
                    <label htmlFor="friends-family-bypass" className="font-semibold text-[#2d2d27] flex items-center gap-1.5 cursor-pointer hover:text-[#7c8a60] transition-colors">
                      <Users className="w-4 h-4 text-[#7c8a60]" />
                      Skip Identity Verification for Friends &amp; Family
                    </label>
                    <p className="text-[#6b6b5f] mt-1 text-[11px] leading-relaxed">
                      Enable to bypass all multi-factor security code prompts and security questions when transferring funds to trusted personal and household relations.
                    </p>
                  </div>
                </div>

                {/* Submit button which triggers secondary MFA verification prompt panel or processes bypass */}
                <button
                  type="submit"
                  disabled={isTransferring || !routingNumber || !accountNumber || !recipient || !amount}
                  className={`w-full text-white font-semibold py-5 rounded-3xl shadow-lg transition-all transform active:scale-[0.98] mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:bg-[#e2e1d5] disabled:text-[#9a9a8c] disabled:shadow-none text-xs sm:text-sm uppercase tracking-wider font-bold ${bypassVerificationForFriendsFamily ? 'bg-[#4b5c2e] hover:bg-[#3b4923] shadow-[#4b5c2e33]' : 'bg-[#7c8a60] hover:bg-[#6c7952] shadow-[#7c8a6033]'}`}
                >
                  {bypassVerificationForFriendsFamily ? (
                    <>
                      <UserCheck className="w-4 h-4 text-[#ebdcc1]" />
                      Instant Friends &amp; Family Settle
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Proceed to Identity Verification &amp; Settle
                    </>
                  )}
                </button>

              </form>
            )}

          </div>

          {/* Compliance Log Monitor display section */}
          {(isTransferring || transferLogs.length > 0) && (
            <div className="bg-[#2d2d27] rounded-3xl border border-[#3d3d35] p-6 text-[#e2e1d5]">
              <div className="flex items-center justify-between border-b border-[#3d3d35] pb-3 mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#a1a193] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#7c8a60]" />
                  Active Routing Trace &amp; Fraud Score Log
                </h3>
                <span className="text-[10px] font-mono text-[#a1a193] animate-pulse">
                  ● FedLine Channel Listening...
                </span>
              </div>

              <div className="bg-[#1e1e1a] p-5 rounded-2xl border border-[#3d3d35] font-mono text-xs text-[#ebdcc1] space-y-2 max-h-60 overflow-y-auto leading-relaxed scrollbar-thin">
                {transferLogs.map((log, idx) => (
                  <div key={idx} className="transition-all duration-300">
                    {log}
                  </div>
                ))}
                {isTransferring && (
                  <div className="flex items-center gap-2 text-[#7c8a60] text-[11px] animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Resolving Nacha/Ofac lookup protocols...</span>
                  </div>
                )}
              </div>

              {transferSuccess !== null && (
                <div className={`mt-5 p-5 rounded-2xl border flex gap-4 ${transferSuccess ? 'bg-[#7c8a60]/15 border-[#7c8a60]/30 text-[#ebdcc1]' : 'bg-red-950/20 border-red-500/20 text-red-200'}`}>
                  {transferSuccess ? (
                    <>
                      <CheckCircle className="w-6 h-6 shrink-0 mt-0.5 text-[#ebdcc1]" />
                      <div>
                        <span className="font-serif italic text-base block text-white font-semibold">Direct Routing Succeeded Instantly</span>
                        <p className="text-xs text-[#a1a193] mt-1.5 leading-relaxed">
                          Secondary MFA cleared successfully. Clearance logs registered on FedNow channels with trace reference <span className="font-mono text-white bg-[#3d3d35] px-1.5 py-0.5 rounded">{transferTrace}</span>. Standard micro-deposits bypassed in high-trust authorization state.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5 text-red-400" />
                      <div>
                        <span className="font-serif italic text-base block text-white font-semibold">Direct Settle Bypass Blocked (Aml Risk Triggered)</span>
                        <p className="text-xs text-[#a1a193] mt-1.5 leading-relaxed">
                          Nacha risk framework intercepted this transfer due to large amount or custom ledger criteria. Multi-day verification deposit codes are strictly required for this account tier.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN (MFA Security Config & Regulatory guidelines info) - 5 span */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* PERSONAL ACCOUNTS & PORTFOLIO MANAGER SECTION */}
          <div className="bg-[#fcfbf9] p-6 sm:p-7 rounded-3xl border-2 border-[#7c8a60]/35 space-y-5 shadow-xs relative">
            <div className="flex items-center justify-between border-b border-[#e2e1d5] pb-3">
              <h2 className="text-base font-serif font-bold text-[#2d2d27] italic flex items-center gap-2">
                <Users className="w-5 h-5 text-[#7c8a60]" />
                Identity Profiles & Accounts
              </h2>
              <span className="text-[9px] bg-[#f0f4e8] text-[#7c8a60] font-mono px-2 py-0.5 rounded border border-[#d2dec0] font-bold uppercase tracking-wider">
                Multi-User Live
              </span>
            </div>

            <p className="text-xs text-[#6b6b5f] leading-relaxed">
              Create individual profiles to save bank accounts. Load any saved account to auto-fill sender parameters (such as routing and account) or recipient parameters instantly.
            </p>

            {/* Profile Selection Dropdown */}
            <div className="space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9a9a8c] mb-1.5">
                    Select Active Account Profile
                  </label>
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-2.5 w-4 h-4 text-[#7c8a60]" />
                    <select
                      value={activeProfileId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        setActiveProfileId(nextId);
                        
                        // Pick first bank account of this new profile and automatically set as sender
                        const nextProf = profiles.find(p => p.id === nextId);
                        if (nextProf && nextProf.savedAccounts.length > 0) {
                          const firstAcc = nextProf.savedAccounts[0];
                          setSenderAccount(`${firstAcc.bankName} (***${firstAcc.account.slice(-4)})`);
                          setAvailableBalance(firstAcc.balance);
                          showFlashFeedback(`Switched to individual profile ${nextProf.name}. Loaded "${firstAcc.bankName}" as primary debiter.`);
                        } else {
                          // set back to defaults
                          setSenderAccount("Primary Treasury Link (***9021)");
                          setAvailableBalance(12450.80);
                          showFlashFeedback(`Switched to ${nextProf ? nextProf.name : 'new identity'}. No saved bank accounts found under this profile.`);
                        }
                      }}
                      className="w-full bg-white border border-[#e2e1d5] rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-[#7c8a60] focus:outline-none focus:border-[#7c8a60] font-semibold text-[#2d2d27]"
                    >
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowProfileCreateForm(!showProfileCreateForm)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${showProfileCreateForm ? 'bg-[#2d2d27] border-[#2d2d27] text-white' : 'bg-white border-[#7c8a60]/35 text-[#7c8a60] hover:bg-[#7c8a60]/5'}`}
                >
                  {showProfileCreateForm ? "Cancel" : "+ New"}
                </button>
              </div>

              {/* Collapsed New Profile Form */}
              {showProfileCreateForm && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newProfileName || !newProfileEmail || !newProfilePhone || !newProfileAnswer) {
                      showFlashFeedback("Please fill out all profile fields.");
                      return;
                    }
                    const newProf: UserProfile = {
                      id: "prof_" + Date.now(),
                      name: newProfileName,
                      email: newProfileEmail,
                      phone: newProfilePhone,
                      securityQuestion: newProfileQuestion,
                      securityAnswer: newProfileAnswer,
                      savedAccounts: []
                    };
                    setProfiles((prev) => [...prev, newProf]);
                    setActiveProfileId(newProf.id);
                    setNewProfileName("");
                    setNewProfileEmail("");
                    setNewProfilePhone("");
                    setNewProfileAnswer("");
                    setShowProfileCreateForm(false);
                    showFlashFeedback(`Created identity profile for ${newProf.name}!`);
                  }}
                  className="bg-[#f7f6f0] p-4 rounded-2xl border border-[#e2e1d5] space-y-3.5"
                >
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-[#7c8a60]">
                    Create New Individual Profile
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-[#9a9a8c] mb-1">
                        Full Legal Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Alice Peterson"
                        value={newProfileName}
                        onChange={(e) => setNewProfileName(e.target.value)}
                        className="w-full bg-white border border-[#e2e1d5] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-[#9a9a8c] mb-1">
                        Email Address (MFA Codes)
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. alice@example.com"
                        value={newProfileEmail}
                        onChange={(e) => setNewProfileEmail(e.target.value)}
                        className="w-full bg-white border border-[#e2e1d5] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-[#9a9a8c] mb-1">
                        SMS Number (MFA Texts)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. +1 (555) 019-2834"
                        value={newProfilePhone}
                        onChange={(e) => setNewProfilePhone(e.target.value)}
                        className="w-full bg-white border border-[#e2e1d5] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-[#9a9a8c] mb-1">
                        MFA Security Answer
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. New York (Case-Insensitive)"
                        value={newProfileAnswer}
                        onChange={(e) => setNewProfileAnswer(e.target.value)}
                        className="w-full bg-white border border-[#e2e1d5] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                       <label className="block text-[9px] font-bold text-[#9a9a8c] mb-1">
                        MFA Identity Question
                      </label>
                      <select
                        value={newProfileQuestion}
                        onChange={(e) => setNewProfileQuestion(e.target.value)}
                        className="w-full bg-white border border-[#e2e1d5] rounded-lg px-2 py-1 text-xs focus:outline-none"
                      >
                        <option value="What was the city of your first bank branch open?">What was the city of your first bank branch open?</option>
                        <option value="What was the prefix of your first debit routing account?">What was the prefix of your first debit routing account?</option>
                        <option value="What is the official brand of your primary bank?">What is the official brand of your primary bank?</option>
                        <option value="What was the name of your first childhood financial educator?">What was the name of your first childhood financial educator?</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#7c8a60] hover:bg-[#6c7952] text-white font-bold py-2 rounded-xl text-xs cursor-pointer text-center"
                  >
                    Save Profile Identity
                  </button>
                </form>
              )}

              {/* Action for Deleting Profile if multiple */}
              {profiles.length > 1 && (
                <div className="flex justify-end pr-1">
                  <button
                    type="button"
                    onClick={() => {
                      const active = profiles.find((p) => p.id === activeProfileId);
                      if (active) {
                        if (window.confirm(`Permanently remove profile "${active.name}" and all associated bank account configurations?`)) {
                          const remaining = profiles.filter((p) => p.id !== activeProfileId);
                          setProfiles(remaining);
                          setActiveProfileId(remaining[0].id);
                          showFlashFeedback(`Deleted profile for ${active.name}.`);
                        }
                      }
                    }}
                    className="text-[10px] text-red-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete Current Profile
                  </button>
                </div>
              )}
            </div>

            {/* Saved Bank Accounts Ledger Title */}
            <div className="border-t border-[#e2e1d5] pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#9a9a8c]">
                  Saved Accounts Portfolio ({profiles.find(p => p.id === activeProfileId)?.savedAccounts.length || 0})
                </span>
                <button
                  type="button"
                  onClick={() => setShowAccCreateForm(!showAccCreateForm)}
                  className="text-[10px] text-[#7c8a60] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                >
                  {showAccCreateForm ? "Cancel Account" : "+ Add Bank Account"}
                </button>
              </div>

              {/* Inline Collapsible Form to save bank details under active profile */}
              {showAccCreateForm && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newAccName || !newAccRouting || !newAccAccount) {
                      showFlashFeedback("Please enter all fields to register a bank account.");
                      return;
                    }
                    if (newAccRouting.length !== 9) {
                      showFlashFeedback("Routing number must be exactly 9 digits.");
                      return;
                    }

                    const newAcc: SavedBankAccount = {
                      id: "acc_" + Date.now(),
                      bankName: newAccName,
                      routing: newAccRouting,
                      account: newAccAccount,
                      balance: parseFloat(newAccBalance) || 0.0
                    };

                    setProfiles((prev) => prev.map((p) => {
                      if (p.id === activeProfileId) {
                        return {
                          ...p,
                          savedAccounts: [...p.savedAccounts, newAcc]
                        };
                      }
                      return p;
                    }));

                    setSenderAccount(`${newAcc.bankName} (***${newAcc.account.slice(-4)})`);
                    setAvailableBalance(newAcc.balance);

                    setNewAccName("");
                    setNewAccRouting("");
                    setNewAccAccount("");
                    setNewAccBalance("12000.00");
                    setShowAccCreateForm(false);
                    showFlashFeedback(`Saved and Loaded ${newAcc.bankName} successfully!`);
                  }}
                  className="bg-[#f0f4e8] p-4 rounded-2xl border border-[#d2dec0] mb-4 space-y-3"
                >
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-[#4b5c2e]">
                    Save New Bank Account details
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] font-bold text-[#7a7a6e]">Bank Name / Nickname</span>
                      <input
                        type="text"
                        placeholder="e.g. Chase Checkings"
                        value={newAccName}
                        onChange={(e) => setNewAccName(e.target.value)}
                        className="w-full bg-white border border-[#e2e1d5] rounded-md px-2.5 py-1 text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-[#7a7a6e]">Initial Balance ($)</span>
                      <input
                        type="number"
                        step="100"
                        placeholder="e.g. 5000.00"
                        value={newAccBalance}
                        onChange={(e) => setNewAccBalance(e.target.value)}
                        className="w-full bg-white border border-[#e2e1d5] rounded-md px-2.5 py-1 text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-[#7a7a6e]">Bank Routing ABA</span>
                      <input
                        type="text"
                        maxLength={9}
                        placeholder="e.g. 021000021"
                        value={newAccRouting}
                        onChange={(e) => setNewAccRouting(e.target.value.replace(/[^0-9]/g, ""))}
                        className="w-full bg-white border border-[#e2e1d5] rounded-md px-2.5 py-1 text-xs focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-[#7a7a6e]">Account Number</span>
                      <input
                        type="text"
                        maxLength={17}
                        placeholder="e.g. 4091827490"
                        value={newAccAccount}
                        onChange={(e) => setNewAccAccount(e.target.value.replace(/[^0-9]/g, ""))}
                        className="w-full bg-white border border-[#e2e1d5] rounded-md px-2.5 py-1 text-xs focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#7c8a60] hover:bg-[#6c7952] text-white font-bold py-1.5 rounded-lg text-xs cursor-pointer text-center"
                  >
                    Confirm &amp; Register Account
                  </button>
                </form>
              )}

              {/* LIST OF CURRENTLY ACTIVE PROFILE'S REGISTERED BANK ACCOUNTS */}
              <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
                {profiles.find(p => p.id === activeProfileId)?.savedAccounts.length === 0 ? (
                  <div className="text-center py-6 px-4 bg-[#fcfbf9] rounded-2xl border border-dashed border-[#e2e1d5]">
                    <Building2 className="w-6 h-6 text-[#9a9a8c]/50 mx-auto mb-1.5" />
                    <p className="text-[11px] text-[#9a9a8c] leading-normal font-medium">
                      No saved bank accounts in this profile.<br />
                      Add one above to enable dynamic bypass!
                    </p>
                  </div>
                ) : (
                  profiles.find(p => p.id === activeProfileId)?.savedAccounts.map((acc) => {
                    const inlineSenderValue = `${acc.bankName} (***${acc.account.slice(-4)})`;
                    const isCurrentActiveDebiter = senderAccount === inlineSenderValue;
                    
                    return (
                      <div
                        key={acc.id}
                        className={`p-3.5 rounded-2xl border transition-all ${isCurrentActiveDebiter ? 'bg-[#f6f8f2] border-[#7c8a60]/50 shadow-xs' : 'bg-white border-[#e2e1d5] hover:border-[#7c8a60]/30'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-serif italic font-bold text-xs text-[#2d2d27] block">
                              {acc.bankName}
                            </span>
                            <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 mt-1 text-[10px] text-[#7a7a6e] font-sans font-medium">
                              <span className="font-mono bg-white/60 text-[#4b5c2e] font-bold border border-[#d2dec0] rounded px-1 flex items-center gap-0.5">
                                ABA: {acc.routing}
                              </span>
                              <span className="font-mono">
                                Acc: ***{acc.account.slice(-4)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-serif font-bold text-[#4b5c2e] bg-[#f0f4e8] px-2 py-0.5 rounded-md border border-[#d2dec0]">
                              ${acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete saved bank configuration for ${acc.bankName}?`)) {
                                  setProfiles((prev) => prev.map((p) => {
                                    if (p.id === activeProfileId) {
                                      return {
                                        ...p,
                                        savedAccounts: p.savedAccounts.filter((a) => a.id !== acc.id)
                                      };
                                    }
                                    return p;
                                  }));
                                  showFlashFeedback(`Deleted bank registration format.`);
                                }
                              }}
                              className="text-[#9a9a8c] hover:text-red-700 p-0.5 transition cursor-pointer"
                              title="Delete saved configuration"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Trigger Activation Buttons directly from the Account Item */}
                        <div className="mt-3 pt-2 border-t border-[#e2e1d5]/50 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSenderAccount(inlineSenderValue);
                              setAvailableBalance(acc.balance);
                              showFlashFeedback(`Loaded "${acc.bankName}" as primary debit sender.`);
                            }}
                            className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold text-center transition cursor-pointer flex items-center justify-center gap-1 ${isCurrentActiveDebiter ? 'bg-[#7c8a60] text-white' : 'bg-[#e2e1d5]/30 hover:bg-[#7c8a60]/10 text-[#4b5c2e]'}`}
                          >
                            <UserCheck className="w-3 h-3" />
                            {isCurrentActiveDebiter ? "Selected Sender" : "Use as Sender"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRoutingNumber(acc.routing);
                              setAccountNumber(acc.account);
                              showFlashFeedback(`Loaded routing & account of "${acc.bankName}" as payment destination.`);
                            }}
                            className="flex-1 bg-white hover:bg-[#7c8a60]/5 text-[#7c8a60] border border-[#7c8a60]/25 py-1.5 px-2 rounded-lg text-[10px] font-bold text-center transition cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            Use as Payee (To)
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* SECTION 1: MFA SETUP & SECURITY CONFIGURATION PANEL */}
          <div className="bg-[#f7f6f0] p-6 sm:p-7 rounded-3xl border border-[#e2e1d5] space-y-5">
            <h2 className="text-base font-serif font-bold text-[#2d2d27] italic flex items-center gap-2 border-b border-[#e2e1d5] pb-3">
              <Settings className="w-4.5 h-4.5 text-[#7c8a60]" />
              MFA Security Configuration
            </h2>

            <p className="text-xs text-[#6b6b5f] leading-relaxed">
              Define the security thresholds and question answers below to simulate real-world customer identity verification protocols.
            </p>

            <div className="space-y-4">
              
              {/* Target email */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9a9a8c] mb-1.5">
                  Verified Contact Email (OTP Target)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-[#9a9a8c]" />
                  <input
                    type="email"
                    value={mfaEmail}
                    onChange={(e) => setMfaEmail(e.target.value)}
                    className="w-full bg-white border border-[#e2e1d5] rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-[#7c8a60] focus:outline-none focus:border-[#7c8a60]"
                  />
                </div>
              </div>

              {/* Target Phone */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9a9a8c] mb-1.5">
                  Verified SMS Number (OTP Target)
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-3 w-4 h-4 text-[#9a9a8c]" />
                  <input
                    type="text"
                    value={mfaSMS}
                    onChange={(e) => setMfaSMS(e.target.value)}
                    className="w-full bg-white border border-[#e2e1d5] rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-[#7c8a60] focus:outline-none focus:border-[#7c8a60]"
                  />
                </div>
              </div>

              {/* Security Question Config selection */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9a9a8c] mb-1.5">
                  Select Security Question
                </label>
                <select
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  className="w-full bg-white border border-[#e2e1d5] rounded-xl px-3 py-2 text-xs text-[#2d2d27] focus:outline-none"
                >
                  <option value="What was the city of your first bank branch open?">What was the city of your first bank branch open?</option>
                  <option value="What was the prefix of your first debit routing account?">What was the prefix of your first debit routing account?</option>
                  <option value="What is the official brand of your primary bank?">What is the official brand of your primary bank?</option>
                  <option value="What was the name of your first childhood financial educator?">What was the name of your first childhood financial educator?</option>
                </select>
              </div>

              {/* Security Answer input */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#9a9a8c] mb-1.5">
                  Custom Security Answer (Case-Insensitive Match)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-[#9a9a8c]" />
                  <input
                    type="text"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    className="w-full bg-white border border-[#e2e1d5] rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-[#7c8a60] focus:outline-none focus:border-[#7c8a60] font-semibold"
                  />
                </div>
                <span className="text-[9px] text-[#9a9a8c] mt-1 block">
                  Match this value in the challenge prompt when testing security answer verification.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    showFlashFeedback("Secured MFA variables update recorded in sandbox memory.");
                  }}
                  className="w-full bg-white hover:bg-[#7c8a60]/10 text-[#7c8a60] border border-[#7c8a60]/30 font-bold py-2 px-3 rounded-xl text-xs transition active:scale-95 duration-100 cursor-pointer"
                >
                  Save and Update MFA Profile
                </button>
              </div>

            </div>
          </div>

          {/* SECTION 1.5: DYNAMIC SCAN-TO-PAY QR CODE GENERATOR */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#e2e1d5] space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#e2e1d5] pb-3">
              <h2 className="text-base font-serif font-bold text-[#2d2d27] italic flex items-center gap-2">
                <QrCode className="w-4.5 h-4.5 text-[#7c8a60]" />
                Dynamic QR Scan-Settle
              </h2>
              <span className="text-[9px] bg-[#f0f4e8] text-[#7c8a60] font-mono px-2 py-0.5 rounded border border-[#d2dec0] flex items-center gap-1.5 font-bold uppercase tracking-wider">
                <span className={`w-1.5 h-1.5 rounded-full ${qrCodeError && qrCodeError.includes("Error") ? 'bg-red-500' : 'bg-[#7c8a60] animate-pulse'}`}></span>
                {qrCodeError && qrCodeError.includes("Error") ? 'Generation Blocked' : 'Active Sync'}
              </span>
            </div>

            <p className="text-xs text-[#6b6b5f] leading-relaxed">
              This dynamic QR code auto-updates in real time based on your designated payee, volume, and routing integers. Scan with a mobile device to initiate direct sandbox linkage.
            </p>

            {/* Validation Check Warning/Error Banner */}
            {qrCodeError && (
              <div className={`p-4 rounded-2xl border flex items-start gap-2.5 transition-all duration-300 ${qrCodeError.includes("Error") ? 'bg-red-50 border-red-200 text-red-950' : 'bg-amber-50 border-amber-200 text-amber-950'}`}>
                <AlertTriangle className={`w-4.5 h-4.5 shrink-0 mt-0.5 ${qrCodeError.includes("Error") ? 'text-red-700' : 'text-amber-700'}`} />
                <div className="text-[11px] space-y-0.5">
                  <span className="font-bold uppercase tracking-wider text-[9px] block">
                    {qrCodeError.includes("Error") ? 'QR Generation Blocked' : 'Payload Density Warning'}
                  </span>
                  <p className="leading-relaxed font-medium">
                    {qrCodeError}
                  </p>
                  <p className="text-[9px] text-[#7a7a6e] mt-1 font-medium">
                    Tip: Shorten your custom transaction memo to optimize the code matrix size.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col items-center justify-center p-4 bg-[#fcfbf9] rounded-2xl border border-[#e2e1d5]/50 relative group">
              {qrCodeDataUrl ? (
                <div className="relative p-2.5 bg-white rounded-2xl border border-[#d2dec0] shadow-sm">
                  <img
                    src={qrCodeDataUrl}
                    alt="Direct Settle Dynamic QR Code"
                    id="dynamic-settle-qr"
                    className="w-44 h-44 object-contain selection:bg-transparent"
                  />
                </div>
              ) : qrCodeError && qrCodeError.includes("Error") ? (
                <div className="w-44 h-44 bg-red-50/50 rounded-2xl border border-dashed border-red-200 flex flex-col items-center justify-center p-4 text-center text-xs text-red-800">
                  <AlertTriangle className="w-7 h-7 text-red-700 mb-2" />
                  <span className="font-bold">Generation Suspended</span>
                  <p className="text-[10px] text-red-600 mt-1">Payload exceeds structural safety threshold.</p>
                </div>
              ) : (
                <div className="w-44 h-44 bg-[#f7f6f0] rounded-2xl border border-dashed border-[#e2e1d5] flex flex-col items-center justify-center text-xs text-[#9a9a8c]">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#7c8a60] mb-2" />
                  <span>Preparing scan code...</span>
                </div>
              )}
              
              <div className="mt-3 flex items-center gap-1 text-[10px] text-[#7a7a6e] font-sans">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${qrCodeError && qrCodeError.includes("Error") ? 'bg-red-500' : 'bg-[#4b5c2e]'}`}></span>
                <span>Active Linkage: </span>
                <span className="font-mono bg-[#f0f4e8] px-1.5 py-0.5 rounded text-[#4b5c2e] font-bold">
                  {recipient ? (recipient.length > 14 ? recipient.slice(0, 12) + "..." : recipient) : "Jane Doe"} (${parseFloat(amount) || 0})
                </span>
              </div>
            </div>

            {/* Embedded scan details debug terminal */}
            <div className="space-y-1.5">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-[#9a9a8c]">
                Embedded QR Payload Data
              </span>
              <pre className="p-3 bg-[#2d2d27] rounded-xl text-[10px] font-mono text-[#ebdcc1] leading-normal max-h-32 overflow-y-auto overflow-x-hidden scrollbar-thin whitespace-pre-wrap select-all">
                {qrCodeActiveDetails || "{}"}
              </pre>
            </div>

            <div className="pt-1 flex gap-2">
              <a
                href={qrCodeDataUrl || undefined}
                onClick={(e) => {
                  if (!qrCodeDataUrl) {
                    e.preventDefault();
                    showFlashFeedback("Unable to download: QR code is currently inactive or limit-blocked.");
                  } else {
                    playFeedbackSound("download");
                  }
                }}
                download={qrCodeDataUrl ? `Oasis_BankLink_QR_${recipient || "NoName"}.png` : undefined}
                className={`w-full font-bold py-2.5 px-3 rounded-xl text-xs text-center flex items-center justify-center gap-1.5 transition active:scale-95 duration-100 cursor-pointer shadow-xs text-white ${!qrCodeDataUrl ? 'bg-[#9a9a8c] cursor-not-allowed opacity-60' : 'bg-[#7c8a60] hover:bg-[#6c7952]'}`}
              >
                <Download className="w-3.5 h-3.5" />
                Download Shareable QR
              </a>
            </div>
          </div>

          {/* SECTION 2: REGULATORY GUIDELINES SECTION */}
          <div className="bg-[#f7f6f0] p-6 sm:p-7 rounded-3xl border border-[#e2e1d5]">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#9a9a8c] mb-4 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#7c8a60]" />
              Federal Identity Rules Guide
            </h2>

            <div className="space-y-4 text-xs leading-relaxed text-[#3d3d35]">
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded bg-[#f0f4e8] border border-[#d2dec0] text-[#7c8a60] font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <h4 className="font-semibold text-[#2d2d27]">Luhn Direct Validation Checksums</h4>
                  <p className="text-[#6b6b5f] text-[11px] mt-0.5">
                    Mod 10 checksums mathematically confirm local route destinations before transferring funds over critical Federal Reserve systems.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 rounded bg-[#f0f4e8] border border-[#d2dec0] text-[#7c8a60] font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <h4 className="font-semibold text-[#2d2d27]">High-Trust Risk Engine Limits</h4>
                  <p className="text-[#6b6b5f] text-[11px] mt-0.5">
                    Wire volumes exceeding $100,000 auto-trigger suspicious transaction guidelines, rendering them ineligible for instant bypass.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-5 h-5 rounded bg-[#f0f4e8] border border-[#d2dec0] text-[#7c8a60] font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <h4 className="font-semibold text-[#2d2d27]">Nacha Anti-Fraud Compliance</h4>
                  <p className="text-[#6b6b5f] text-[11px] mt-0.5 text-slate-800">
                    Sustained identity matching confirms valid target bank active codes to secure wire systems safely against credential manipulation.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 p-4 bg-white border border-[#e2e1d5]/80 rounded-2xl flex gap-2 text-[11px] text-[#6b6b5f]">
              <Info className="w-4 h-4 text-[#7c8a60] shrink-0 mt-0.5" />
              <span>
                <strong>Integration Note:</strong> This application demonstrates simulated routing validations. For direct core connections, always integrate standard OAuth links (Plaid/Stripe Connections).
              </span>
            </div>
          </div>

        </div>

      </main>

      {/* FULL WIDTH DEDICATED SECTION 3: TRANSACTION HISTORY DATABASE & LEDGER CONSOLE */}
      <section id="ledger-section" className="bg-[#f7f6f0] border-t border-[#e9e8e0] py-12 px-6 sm:px-10 mt-10">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e2e1d5] pb-4">
            <div>
              <h2 className="text-2xl font-serif text-[#2d2d27] italic flex items-center gap-2">
                <History className="w-6 h-6 text-[#7c8a60]" />
                Compliance Clearance Ledger Database
              </h2>
              <p className="text-xs text-[#7a7a6e]">
                View, sort, filter and audit all secure direct bypass transfers logged in local sandbox memory.
              </p>
            </div>

            {/* Actions for Ledger Database */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportCSV}
                className="bg-white hover:bg-slate-50 text-[#2d2d27] border border-[#e2e1d5] text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition active:scale-95 duration-100 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#7c8a60]" />
                Export Ledger (CSV)
              </button>
              <button
                type="button"
                onClick={handleResetStorage}
                className="bg-white hover:bg-red-50 text-red-700 border border-red-200 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition active:scale-95 duration-100 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Reset Sandbox
              </button>
            </div>
          </div>

          {/* LEDGER ANALYTICS & VISUALIZATION DASHBOARD */}
          <div className="bg-[#fdfdfb] p-6 rounded-3xl border border-[#e2e1d5] space-y-4">
            <div className="flex items-center justify-between border-b border-[#e2e1d5]/60 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#7c8a60]" />
                <h3 className="font-serif italic font-bold text-sm text-[#2d2d27]">
                  Ledger Analytics &amp; Clearance Trends
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="text-[10px] bg-[#faf9f5] hover:bg-[#eae9e1] text-[#7a7a6e] font-sans font-bold px-3 py-1.5 rounded-lg border border-[#e2e1d5] transition cursor-pointer flex items-center gap-1"
              >
                <Activity className="w-3 h-3 text-[#7c8a60]" />
                {showAnalytics ? "Minimize Dashboard" : "Expand Dashboard"}
              </button>
            </div>

            {showAnalytics && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-1">
                
                {/* 1. KEY SUITE METRICS */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div className="bg-[#fcfbf9]/60 p-4 rounded-2xl border border-[#e2e1d5]/80 space-y-3.5 flex-1 flex flex-col justify-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#9a9a8c] block">
                      Clearance Security Ratio
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-serif italic font-bold text-[#4b5c2e]">
                        {chartData.totals.successRatePercentage}%
                      </span>
                      <span className="text-xs text-[#7a7a6e] font-sans font-semibold">
                        Bypass Clearance
                      </span>
                    </div>
                    {/* Visual Success Indicator bar */}
                    <div className="w-full bg-[#f1f0e8] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#7c8a60] h-full rounded-full transition-all duration-500"
                        style={{ width: `${chartData.totals.successRatePercentage}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#8a8a7c] leading-tight block">
                      Total transactions success: {chartData.totals.totalTxCount - (chartData.statusCounts.find(s => s.name === "Blocked Risks")?.count || 0)} of {chartData.totals.totalTxCount}.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3.5 rounded-2xl border border-[#e2e1d5]/85">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#9a9a8c] block mb-1">
                        Cleared Capital
                      </span>
                      <span className="text-sm font-serif font-bold text-[#7c8a60] block">
                        ${chartData.totals.totalCleared.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-[#e2e1d5]/85">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#9a9a8c] block mb-1">
                        Risk Blocked
                      </span>
                      <span className="text-sm font-serif font-bold text-[#b91c1c] block">
                        ${chartData.totals.totalBlocked.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. AREA CHART: VOLUME CHRONOLOGICAL FLOW */}
                <div className="bg-white p-4 rounded-2xl border border-[#e2e1d5]/90 flex flex-col h-60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#9a9a8c] flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-[#7c8a60]" />
                      Capital Movement Trend
                    </span>
                    <span className="text-[9px] font-mono font-bold text-[#7a7a6e]">
                      Cumulative Volume (USD)
                    </span>
                  </div>

                  {chartData.trendPoints.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-[#9a9a8c] text-xs">
                      No transaction volume recorded.
                    </div>
                  ) : (
                    <div className="flex-1 w-full text-xs">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={chartData.trendPoints}
                          margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#7c8a60" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#7c8a60" stopOpacity={0.00}/>
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="displayLabel"
                            tickLine={false}
                            axisLine={false}
                            fontSize={9}
                            stroke="#8a8a7c"
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            fontSize={9}
                            stroke="#8a8a7c"
                            tickFormatter={(v) => `$${v >= 1000 ? (v / 1000) + 'k' : v}`}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-[#2d2d27] text-white p-2.5 rounded-xl border border-neutral-700 text-[10px] space-y-1 shadow-lg max-w-[180px]">
                                    <p className="font-bold border-b border-white/20 pb-0.5">Trace {data.id}</p>
                                    <p className="truncate"><span className="text-[#9a9a8c]">Payee:</span> {data.recipient}</p>
                                    <p><span className="text-[#9a9a8c]">Value:</span> ${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                    <p><span className="text-[#9a9a8c]">Cumulative:</span> ${data.cumulativeVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="cumulativeVolume"
                            stroke="#7c8a60"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorCumulative)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* 3. BAR CHART: ROUTING TYPE FREQUENCY DISTRIBUTION */}
                <div className="bg-white p-4 rounded-2xl border border-[#e2e1d5]/90 flex flex-col h-60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#9a9a8c] flex items-center gap-1">
                      <LucidePieChart className="w-3.5 h-3.5 text-[#7c8a60]" />
                      Clearance Protocol Share
                    </span>
                    <span className="text-[9px] font-mono font-bold text-[#7a7a6e]">
                      Count Frequency
                    </span>
                  </div>

                  {chartData.statusCounts.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-[#9a9a8c] text-xs">
                      No logs mapped.
                    </div>
                  ) : (
                    <div className="flex-1 w-full text-xs">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartData.statusCounts}
                          margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                        >
                          <XAxis
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            fontSize={8}
                            stroke="#8a8a7c"
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            fontSize={9}
                            stroke="#8a8a7c"
                            allowDecimals={false}
                          />
                          <Tooltip
                            cursor={{ fill: '#7c8a60', opacity: 0.05 }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-[#2d2d27] text-white p-2 rounded-lg text-[10px] shadow-lg">
                                    <p className="font-bold">{data.name}</p>
                                    <p>Count: <span className="text-[#a1b285] font-mono">{data.count} txs</span></p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar
                            dataKey="count"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={32}
                          >
                            {chartData.statusCounts.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* ADVANCED FILTERING & SORTING OPTION CONTROLS BAR */}
          <div className="bg-white p-5 rounded-3xl border border-[#e2e1d5] space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-[#9a9a8c] block flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-[#7c8a60]" />
              Database Filter &amp; Sort Panel
            </span>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* 1. Search Query Box */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-[#9a9a8c]" />
                <input
                  type="text"
                  placeholder="Search Recipient, Trace, Routing..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#f9f9f6] border border-[#e2e1d5] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#2d2d27]"
                />
              </div>

              {/* 2. Filter by status */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#7a7a6e] font-semibold uppercase tracking-wider shrink-0">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-[#f9f9f6] border border-[#e2e1d5] rounded-xl px-3 py-2.5 text-xs text-[#2d2d27] focus:outline-none"
                >
                  <option value="All">All statuses</option>
                  <option value="Completed (FedNow)">Completed (FedNow)</option>
                  <option value="Completed (FedACH)">Completed (FedACH)</option>
                  <option value="Blocked (Risk Override)">Blocked (Risk Override)</option>
                </select>
              </div>

              {/* 3. Filter by amount levels */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#7a7a6e] font-semibold uppercase tracking-wider shrink-0 font-sans">Amount:</span>
                <select
                  value={amountFilter}
                  onChange={(e) => setAmountFilter(e.target.value)}
                  className="w-full bg-[#f9f9f6] border border-[#e2e1d5] rounded-xl px-3 py-2.5 text-xs text-[#2d2d27]"
                >
                  <option value="All">All levels</option>
                  <option value="under-1000">Under $1,000 (Micro)</option>
                  <option value="1000-10000">$1,000 - $10,000 (Standard)</option>
                  <option value="over-10000">Over $10,000 (Enterprise/Macro)</option>
                </select>
              </div>

              {/* 4. Interactive Sorting Options */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#7a7a6e] font-semibold uppercase tracking-wider shrink-0 flex items-center gap-0.5">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  Sort:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-[#f9f9f6] border border-[#e2e1d5] rounded-xl px-3 py-2.5 text-xs text-[#2d2d27]"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="amount-desc">Amount (Highest First)</option>
                  <option value="amount-asc">Amount (Lowest First)</option>
                  <option value="name-asc">Recipient Name (A-Z)</option>
                  <option value="name-desc">Recipient Name (Z-A)</option>
                </select>
              </div>

            </div>

            {/* Mini Summary of search targets */}
            <div className="flex justify-between items-center text-xs text-[#8a8a7c] border-t border-[#f7f6f0] pt-3">
              <span>
                Showing <strong>{sortedTransfers.length}</strong> trace results out of <strong>{pastTransfers.length}</strong> recorded.
              </span>
              {(searchTerm || statusFilter !== "All" || amountFilter !== "All") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("All");
                    setAmountFilter("All");
                    showFlashFeedback("All database lookup query filters reset.");
                  }}
                  className="text-[#7c8a60] font-bold hover:underline"
                >
                  Reset Active Filters
                </button>
              )}
            </div>

          </div>

          {/* DYNAMIC DATABASE GRID / COMPREHENSIVE LEDGER TABLE */}
          <div className="bg-white rounded-3xl border border-[#e2e1d5] overflow-hidden shadow-xs">
            {sortedTransfers.length === 0 ? (
              <div className="p-12 text-center text-[#7a7a6e] space-y-2">
                <AlertTriangle className="w-8 h-8 mx-auto text-amber-500" />
                <h4 className="font-serif italic text-base font-semibold text-[#2d2d27]">No Matching Trace Logs Found</h4>
                <p className="text-xs max-w-md mx-auto">
                  Try adjusting search strings, resetting the filter criteria or simulation logs array.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  
                  <thead className="bg-[#f7f6f0] border-b border-[#ebdcc1]/40 uppercase tracking-widest text-[#9a9a8c] font-bold">
                    <tr>
                      <th className="px-5 py-4 font-mono text-[10px]">Trace ID &amp; Time</th>
                      <th className="px-5 py-4">Sender Ledger</th>
                      <th className="px-5 py-4">Recipient Name</th>
                      <th className="px-5 py-4">Routing / Account Specs</th>
                      <th className="px-5 py-4 text-right">Amount (USD)</th>
                      <th className="px-5 py-4 text-center">Fulfillment Status</th>
                      <th className="px-5 py-4">Risk Audit Reason / Trace Note</th>
                      <th className="px-5 py-4 text-center">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#e9e8e0] text-[#3d3d35]">
                    {sortedTransfers.map((tx) => (
                      <tr key={tx.traceId} className="hover:bg-[#f7f6f0]/60 transition-colors">
                        
                        {/* 1. Trace Check ID & Absolute Time */}
                        <td className="px-5 py-4 font-medium whitespace-nowrap">
                          <span className="font-mono text-[#7c8a60] font-bold block bg-[#f0f4e8] border border-[#d2dec0]/60 px-2 py-0.5 rounded-md text-[10px] w-max">
                            {tx.traceId}
                          </span>
                          <span className="text-[10px] text-[#8a8a7c] block mt-1.5 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#7a7a6e]" />
                            {tx.time}
                          </span>
                        </td>

                        {/* 2. Sender Account */}
                        <td className="px-5 py-4 font-medium max-w-[150px] truncate block sm:table-cell mt-1">
                          <span className="block">{tx.senderAccount}</span>
                          <span className="text-[9px] text-[#9a9a8c] uppercase font-bold tracking-wider">Authorized Bypass</span>
                        </td>

                        {/* 3. Recipient Name */}
                        <td className="px-5 py-4 font-serif italic text-sm text-[#2d2d27] font-semibold">
                          {tx.recipientName}
                        </td>

                        {/* 4. Routing Code Specs */}
                        <td className="px-5 py-4 font-mono text-[11px] whitespace-nowrap">
                          <span className="block text-[#2d2d27]">ABA: {tx.routing}</span>
                          <span className="text-[#8a8a7c] block">Acct: {tx.account}</span>
                        </td>

                        {/* 5. Amount */}
                        <td className="px-5 py-4 text-right font-serif font-bold text-sm text-[#2d2d27] whitespace-nowrap">
                          ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>

                        {/* 6. Fulfillment Status Badges */}
                        <td className="px-5 py-4 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border inline-block ${
                            tx.status.includes("FedNow") ? "bg-[#f0f4e8] border-[#d2dec0] text-[#7c8a60]" :
                            tx.status.includes("FedACH") ? "bg-[#e2e1d5]/45 border-[#d3d2c6] text-[#6b6b5f]" :
                            "bg-red-50 border-red-200 text-red-700"
                          }`}>
                            {tx.status}
                          </span>
                        </td>

                        {/* 7. Risk and Fraud Engine Reason details */}
                        <td className="px-5 py-4 text-[11px] text-[#6b6b5f] max-w-[200px] leading-relaxed">
                          <span className="block font-medium text-slate-700">{tx.complianceReason}</span>
                          <span className="text-[9px] font-mono whitespace-nowrap text-[#a1a193]">Verified under clearance 2.4.0</span>
                        </td>

                        {/* 8. Destructive Action Button for ledger log editing */}
                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteTx(tx.traceId)}
                            className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                            title="Delete this record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>

                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* Persistent Footer Dashboard Panel */}
      <footer className="bg-[#2d2d27] text-[#e2e1d5] py-10 border-t border-[#3d3d35]">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex gap-10">
            <div>
              <div className="text-[10px] uppercase opacity-55 tracking-widest mb-1 font-bold">Simulated Vault Reserve</div>
              <div className="text-xl font-serif italic text-[#ebdcc1]">${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase opacity-55 tracking-widest mb-1 font-bold">Last Security compliance audit</div>
              <div className="text-xs text-[#a1a193]">Secure Direct Bypass Active · SHA256 matches verified</div>
            </div>
          </div>
          <div className="text-right flex flex-col items-center md:items-end gap-1">
            <span className="text-[10px] uppercase opacity-55 tracking-widest font-mono">Clearing mechanism: Local Routing + Gemini Fallback API</span>
            <p className="text-[11px] text-[#8a8a7c]">© 2026 Oasis direct gateway simulation system. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
