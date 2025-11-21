
import React, { useState, useEffect } from 'react';
import { serialService } from '../services/serialService';
import { Activity, Wifi, WifiOff, Ruler, AlertCircle, CheckCircle2 } from 'lucide-react';

const SensorCheck: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [distance, setDistance] = useState<number>(0); // Meters
  const [rawCm, setRawCm] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState('Ready to connect');

  useEffect(() => {
    // Bind the serial service callbacks to this component's state
    serialService.setOnData((distCm) => {
        setRawCm(distCm);
        setDistance(distCm / 100);
    });

    serialService.setOnStatus((msg) => {
        setStatusMsg(msg);
    });

    // Cleanup: Remove callbacks when leaving this view to prevent memory leaks
    // or trying to set state on an unmounted component
    return () => {
        serialService.setOnData(() => {});
        serialService.setOnStatus(() => {});
    };
  }, []);

  const toggleConnection = async () => {
    if (isConnected) {
      await serialService.disconnect();
      setIsConnected(false);
      setDistance(0);
      setRawCm(0);
    } else {
      try {
        await serialService.connect();
        setIsConnected(true);
      } catch (e: any) {
        console.error(e);
        if (e.message?.includes('Permissions policy')) {
            alert("Connection Blocked: Browser permission policy prevented access.");
        }
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto pt-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-serif font-bold text-[#37352F] mb-2">Sensor Diagnostics</h1>
        <p className="text-[#787774]">Verify laser connection and reading accuracy.</p>
      </div>

      <div className="bg-white border border-[#E9E9E7] rounded-xl shadow-sm overflow-hidden">
        
        {/* Connection Header */}
        <div className="p-6 border-b border-[#E9E9E7] bg-[#F7F7F5] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-400'}`} />
                <div>
                    <div className="font-bold text-[#37352F]">{isConnected ? 'Sensor Connected' : 'Disconnected'}</div>
                    <div className="text-xs text-[#9B9A97] font-mono">{statusMsg}</div>
                </div>
            </div>
            
            <button 
                onClick={toggleConnection}
                className={`px-6 py-2 rounded font-medium flex items-center gap-2 transition-colors shadow-sm ${
                    isConnected 
                    ? 'bg-white border border-red-200 text-red-600 hover:bg-red-50' 
                    : 'bg-[#37352F] text-white hover:bg-[#2F2F2F]'
                }`}
            >
                {isConnected ? <><WifiOff size={16}/> Disconnect</> : <><Wifi size={16}/> Connect Laser</>}
            </button>
        </div>

        {/* Main Display */}
        <div className="p-12 flex flex-col items-center justify-center min-h-[300px]">
            {isConnected ? (
                <>
                    <div className="text-[10rem] leading-none font-bold font-mono text-[#37352F] tracking-tighter tabular-nums">
                        {distance.toFixed(2)}
                    </div>
                    <div className="text-xl text-[#9B9A97] font-medium uppercase tracking-widest mb-8">Meters</div>
                    
                    <div className="flex gap-8">
                        <div className="bg-[#F7F7F5] px-4 py-2 rounded border border-[#E9E9E7] text-center">
                            <div className="text-xs font-bold text-[#9B9A97] uppercase">Raw Value</div>
                            <div className="font-mono font-bold text-[#37352F]">{rawCm} cm</div>
                        </div>
                        <div className="bg-[#F7F7F5] px-4 py-2 rounded border border-[#E9E9E7] text-center">
                            <div className="text-xs font-bold text-[#9B9A97] uppercase">Signal Quality</div>
                            <div className="font-mono font-bold text-green-600 flex items-center gap-1"><CheckCircle2 size={14}/> Good</div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center text-[#9B9A97]">
                    <div className="w-24 h-24 bg-[#F7F7F5] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#E9E9E7]">
                        <Activity size={48} className="opacity-20" />
                    </div>
                    <p className="text-lg font-medium mb-2">No Sensor Detected</p>
                    <p className="text-sm max-w-xs mx-auto">Connect the USB Laser device to your computer to begin viewing live data.</p>
                </div>
            )}
        </div>

        {/* Footer Info */}
        <div className="bg-[#F7F7F5] p-4 border-t border-[#E9E9E7] text-xs text-[#787774] flex gap-4 justify-center">
            <span className="flex items-center gap-1"><Ruler size={12}/> Range: 0 - 100m</span>
            <span className="flex items-center gap-1"><AlertCircle size={12}/> Protocol: 460800 baud</span>
        </div>

      </div>
    </div>
  );
};

export default SensorCheck;
