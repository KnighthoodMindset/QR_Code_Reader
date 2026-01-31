import { useEffect, useMemo, useRef, useState } from "react";
import QrScanner from "qr-scanner";

QrScanner.WORKER_PATH = QrScanner.WORKER_PATH || undefined; // safe for modern bundlers

function isLikelyUrl(text = "") {
  try {
    const u = new URL(text);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function App() {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  const [decoded, setDecoded] = useState("");
  const [status, setStatus] = useState("Idle");
  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState("");

  const decodedIsUrl = useMemo(() => isLikelyUrl(decoded), [decoded]);

  useEffect(() => {
    return () => {
      // cleanup on unmount
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, []);

  async function startCamera() {
    setError("");
    setStatus("Starting camera...");
    try {
      if (!videoRef.current) return;

      // create scanner only once
      if (!scannerRef.current) {
        scannerRef.current = new QrScanner(
          videoRef.current,
          (result) => {
            const text = result?.data || "";
            if (text) {
              setDecoded(text);
              setStatus("QR detected ✅");
            }
          },
          {
            returnDetailedScanResult: true,
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        );
      }

      await scannerRef.current.start();
      setCameraOn(true);
      setStatus("Camera ON — scanning...");
    } catch (e) {
      setCameraOn(false);
      setStatus("Failed");
      setError(
        "Camera permission denied or camera not available. Try image upload instead."
      );
    }
  }

  async function stopCamera() {
    setError("");
    try {
      await scannerRef.current?.stop();
    } finally {
      setCameraOn(false);
      setStatus("Camera OFF");
    }
  }

  async function handleImageUpload(e) {
    setError("");
    setStatus("Scanning image...");
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      const text = result?.data || "";
      setDecoded(text);
      setStatus(text ? "QR decoded ✅" : "No QR found");
    } catch (err) {
      setStatus("No QR found");
      setDecoded("");
      setError("Could not detect a QR in that image. Try a clearer image.");
    } finally {
      e.target.value = "";
    }
  }

  function navigateNow() {
    if (!decodedIsUrl) return;
    window.location.href = decoded; // same-tab navigation
  }

  function copyText() {
    if (!decoded) return;
    navigator.clipboard.writeText(decoded);
    setStatus("Copied ✅");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-slate-900/60 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-semibold">QR Code Reader</h1>
          <p className="text-slate-300 mt-1">
            Scan using camera or upload an image. Output will appear below and you can navigate if it’s a link.
          </p>
        </div>

        <div className="p-6 grid gap-6 md:grid-cols-2">
          {/* Scanner Panel */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-slate-300">Scanner</div>
              <div className="text-xs px-2 py-1 rounded-full border border-slate-700 text-slate-300">
                {status}
              </div>
            </div>

            <div className="mt-3 aspect-video rounded-lg overflow-hidden border border-slate-800 bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {!cameraOn ? (
                <button
                  onClick={startCamera}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 transition"
                >
                  Start Camera
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 transition"
                >
                  Stop Camera
                </button>
              )}

              <label className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer">
                Upload QR Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => {
                  setDecoded("");
                  setStatus("Cleared");
                  setError("");
                }}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
              >
                Clear
              </button>
            </div>

            {error ? (
              <div className="mt-3 text-sm text-rose-300">{error}</div>
            ) : null}
          </div>

          {/* Output Panel */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
            <div className="text-sm text-slate-300">Decoded Output</div>

            <div className="mt-3 min-h-[140px] rounded-lg border border-slate-800 bg-slate-950 p-3">
              {decoded ? (
                <div className="break-words whitespace-pre-wrap text-slate-100">
                  {decoded}
                </div>
              ) : (
                <div className="text-slate-500">
                  Scan a QR to see the result here.
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={copyText}
                disabled={!decoded}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition disabled:opacity-50 disabled:hover:bg-slate-800"
              >
                Copy
              </button>

              <button
                onClick={navigateNow}
                disabled={!decodedIsUrl}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition disabled:opacity-50 disabled:hover:bg-indigo-600"
              >
                Open Link
              </button>
            </div>

            {decodedIsUrl ? (
              <div className="mt-3 text-xs text-slate-400">
                Detected as URL → clicking “Open Link” will navigate.
              </div>
            ) : decoded ? (
              <div className="mt-3 text-xs text-slate-400">
                Not a URL — you can copy it.
              </div>
            ) : null}
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 text-xs text-slate-400">
          Tip: If camera doesn’t work in dev, try running on HTTPS or use image upload.
        </div>
      </div>
    </div>
  );
}
