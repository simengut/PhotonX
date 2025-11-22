import React, { useState } from 'react';
import { Book, ChevronDown, ChevronRight, AlertCircle, CheckCircle, Zap, Settings as SettingsIcon, Activity, TrendingUp } from 'lucide-react';

const Guide: React.FC = () => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['getting-started']));

  const toggleSection = (section: string) => {
    // Save current scroll position
    const scrollY = window.scrollY;

    const newOpen = new Set(openSections);
    if (newOpen.has(section)) {
      newOpen.delete(section);
    } else {
      newOpen.add(section);
    }
    setOpenSections(newOpen);

    // Restore scroll position immediately after state update
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  };

  const Section = ({ id, title, icon: Icon, children }: { id: string; title: string; icon: any; children: React.ReactNode }) => {
    const isOpen = openSections.has(id);
    const contentRef = React.useRef<HTMLDivElement>(null);

    return (
      <div className="border border-[#E9E9E7] rounded-xl overflow-hidden bg-white mb-4">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between p-4 hover:bg-[#F7F7F5] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F7F7F5] flex items-center justify-center">
              <Icon size={20} className="text-[#37352F]" />
            </div>
            <h2 className="text-lg font-serif font-bold text-[#37352F]">{title}</h2>
          </div>
          {isOpen ? <ChevronDown size={20} className="text-[#9B9A97]" /> : <ChevronRight size={20} className="text-[#9B9A97]" />}
        </button>
        <div
          ref={contentRef}
          style={{
            maxHeight: isOpen ? `${contentRef.current?.scrollHeight}px` : '0px',
            overflow: 'hidden',
            transition: 'max-height 0.3s ease-in-out'
          }}
        >
          <div className="p-6 pt-4 border-t border-[#E9E9E7] bg-[#FAFAFA]">
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-[#37352F] mb-2 flex items-center gap-3">
          <Book size={32} />
          User Guide
        </h1>
        <p className="text-[#787774]">Complete guide to using VectorX for athletic performance measurement</p>
      </div>

      {/* Getting Started */}
      <Section id="getting-started" title="Getting Started" icon={Book}>
        <div className="space-y-4 text-[#37352F]">
          <p className="text-sm leading-relaxed">
            VectorX is a professional laser-based measurement system for athletics. It provides precise speed, distance, and time measurements for training and competition.
          </p>

          <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              What You'll Need
            </h3>
            <ul className="text-sm space-y-1 ml-6 list-disc text-[#787774]">
              <li>VectorX laser sensor unit</li>
              <li>Tripod or stable mounting surface</li>
              <li>This app (installed on phone/tablet/computer)</li>
              <li>Bluetooth-enabled device</li>
              <li>Clear line of sight for measurement area</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* How the Laser Works */}
      <Section id="how-it-works" title="How the Laser Works" icon={Zap}>
        <div className="space-y-4 text-[#37352F]">
          <p className="text-sm leading-relaxed">
            The VectorX laser uses advanced time-of-flight technology to track athlete movement with sub-centimeter accuracy.
          </p>

          <div className="space-y-3">
            <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
              <h4 className="font-bold text-sm mb-2">1. Detection</h4>
              <p className="text-sm text-[#787774]">
                The laser continuously emits infrared light pulses. When an athlete enters the beam path, the reflected light is detected.
              </p>
            </div>

            <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
              <h4 className="font-bold text-sm mb-2">2. Distance Calculation</h4>
              <p className="text-sm text-[#787774]">
                By measuring the time it takes for light to return, the sensor calculates distance with millimeter precision (speed of light × time / 2).
              </p>
            </div>

            <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
              <h4 className="font-bold text-sm mb-2">3. Speed & Velocity</h4>
              <p className="text-sm text-[#787774]">
                The system takes measurements 100+ times per second, calculating instantaneous speed from distance changes over time.
              </p>
            </div>

            <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
              <h4 className="font-bold text-sm mb-2">4. Data Processing</h4>
              <p className="text-sm text-[#787774]">
                Raw data is filtered and processed to provide smooth velocity curves, split times, and performance metrics.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-blue-900">
              <strong>Accuracy:</strong> The system is accurate to ±2cm for distance and ±0.01s for timing at normal athletic speeds.
            </p>
          </div>
        </div>
      </Section>

      {/* Laser Setup */}
      <Section id="setup" title="Laser Setup & Placement" icon={SettingsIcon}>
        <div className="space-y-4 text-[#37352F]">
          <h3 className="font-bold">Step-by-Step Setup:</h3>

          <div className="space-y-3">
            <div className="bg-white border-l-4 border-[#37352F] p-4 rounded">
              <h4 className="font-bold text-sm mb-1">Step 1: Position the Laser</h4>
              <p className="text-sm text-[#787774]">
                Mount the laser on a tripod at approximately 1-1.5m height. Position it at the finish line or starting point, depending on your test type.
              </p>
            </div>

            <div className="bg-white border-l-4 border-[#37352F] p-4 rounded">
              <h4 className="font-bold text-sm mb-1">Step 2: Align the Beam</h4>
              <p className="text-sm text-[#787774] mb-2">
                Point the laser along the running lane. The beam should be parallel to the ground and perpendicular to the athlete's path.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-900">
                ⚠️ Ensure no obstacles block the beam path for at least 60-100m
              </div>
            </div>

            <div className="bg-white border-l-4 border-[#37352F] p-4 rounded">
              <h4 className="font-bold text-sm mb-1">Step 3: Power On & Connect</h4>
              <ul className="text-sm text-[#787774] space-y-1 ml-4 list-disc">
                <li>Turn on the laser sensor unit</li>
                <li>Open the VectorX app</li>
                <li>Go to Settings → Sensor Check</li>
                <li>Enable Bluetooth and connect to your device</li>
                <li>Wait for "Connected" status</li>
              </ul>
            </div>

            <div className="bg-white border-l-4 border-[#37352F] p-4 rounded">
              <h4 className="font-bold text-sm mb-1">Step 4: Calibration Check</h4>
              <p className="text-sm text-[#787774]">
                Use Sensor Check to verify readings. Place an object at a known distance and confirm accuracy. Typical room temperature readings should be stable within ±1cm.
              </p>
            </div>
          </div>

          <div className="bg-white border border-[#E9E9E7] rounded-lg p-4 mt-4">
            <h4 className="font-bold text-sm mb-2">Optimal Placement Tips:</h4>
            <ul className="text-sm text-[#787774] space-y-1 ml-4 list-disc">
              <li><strong>40-Yard Dash:</strong> Place at start line, athlete runs away from laser</li>
              <li><strong>Fly 30m:</strong> Place at start of fly zone, athlete passes through beam</li>
              <li><strong>60m Run:</strong> Place at start line for full-distance tracking</li>
              <li><strong>Long Jump/Pole Vault:</strong> Place perpendicular to runway at takeoff board</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* Using the App */}
      <Section id="using-app" title="Using the App" icon={Activity}>
        <div className="space-y-4 text-[#37352F]">
          <h3 className="font-bold">Complete Workflow:</h3>

          <div className="space-y-3">
            <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
              <h4 className="font-bold text-sm mb-2">1. Create Athletes</h4>
              <p className="text-sm text-[#787774] mb-2">
                Go to Athletes → Add Athlete. Enter name, gender, date of birth, and primary event. You can add multiple athletes to your roster.
              </p>
            </div>

            <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
              <h4 className="font-bold text-sm mb-2">2. Start a Session</h4>
              <p className="text-sm text-[#787774] mb-2">
                From Dashboard, tap "New Session" → Select test type → Choose athletes → Name your session → Start
              </p>
              <div className="text-xs text-[#9B9A97] bg-[#F7F7F5] p-2 rounded">
                Available tests: Free Run, 40-Yard Dash, 30m Acceleration, 30m Fly, 60m Run, Long Jump, Pole Vault
              </div>
            </div>

            <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
              <h4 className="font-bold text-sm mb-2">3. Record Runs</h4>
              <p className="text-sm text-[#787774]">
                Select athlete → Tap "Start Measurement" → Athlete performs run → Data automatically captured → Add notes if needed → Save
              </p>
            </div>

            <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
              <h4 className="font-bold text-sm mb-2">4. Review Results</h4>
              <p className="text-sm text-[#787774] mb-2">
                Each run shows: final time, max speed, velocity graph, split times (10m, 20m, 30m, etc.), and full data breakdown
              </p>
            </div>

            <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
              <h4 className="font-bold text-sm mb-2">5. End Session & Export</h4>
              <p className="text-sm text-[#787774]">
                When done, tap "End Session" → Personal bests are automatically detected → Option to post to Leaderboard → Download PDF report
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Understanding Metrics */}
      <Section id="metrics" title="Understanding Metrics" icon={TrendingUp}>
        <div className="space-y-4 text-[#37352F]">
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
              <h4 className="font-bold text-sm mb-1">Total Time</h4>
              <p className="text-sm text-[#787774]">
                The complete duration from start to finish line. Measured in seconds with 0.001s precision.
              </p>
            </div>

            <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
              <h4 className="font-bold text-sm mb-1">Max Speed (Vmax)</h4>
              <p className="text-sm text-[#787774]">
                The highest instantaneous velocity reached during the run, measured in m/s or km/h. Critical for sprinters.
              </p>
            </div>

            <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
              <h4 className="font-bold text-sm mb-1">Split Times</h4>
              <p className="text-sm text-[#787774]">
                Times at specific distances (10m, 20m, 30m, etc.). Used to analyze acceleration patterns and identify performance phases.
              </p>
            </div>

            <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
              <h4 className="font-bold text-sm mb-1">Velocity Graph</h4>
              <p className="text-sm text-[#787774]">
                Visual representation of speed over distance. Shows acceleration phase, max velocity plateau, and deceleration (if any).
              </p>
            </div>

            <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
              <h4 className="font-bold text-sm mb-1">Average Speed</h4>
              <p className="text-sm text-[#787774]">
                Total distance divided by total time. Useful for endurance events and pacing analysis.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Troubleshooting */}
      <Section id="troubleshooting" title="Troubleshooting" icon={AlertCircle}>
        <div className="space-y-4 text-[#37352F]">
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-bold text-sm text-red-900 mb-2">❌ Laser won't connect</h4>
              <ul className="text-sm text-red-800 space-y-1 ml-4 list-disc">
                <li>Ensure Bluetooth is enabled on your device</li>
                <li>Check that laser unit is powered on (LED indicator)</li>
                <li>Move closer to the sensor (within 10m)</li>
                <li>Restart the app and try reconnecting</li>
                <li>Check battery level of laser unit</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-bold text-sm text-yellow-900 mb-2">⚠️ Inconsistent readings</h4>
              <ul className="text-sm text-yellow-800 space-y-1 ml-4 list-disc">
                <li>Check for obstacles in beam path</li>
                <li>Verify laser is level and stable (use tripod)</li>
                <li>Avoid direct sunlight interference</li>
                <li>Clean laser lens with microfiber cloth</li>
                <li>Recalibrate using Sensor Check</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-bold text-sm text-blue-900 mb-2">ℹ️ Run not recording</h4>
              <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
                <li>Ensure athlete breaks the laser beam</li>
                <li>Check that measurement has been started</li>
                <li>Verify connection status (should show "Connected")</li>
                <li>Athlete should move directly away from or toward laser</li>
                <li>Check that auto-start threshold is appropriate</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-bold text-sm text-green-900 mb-2">✓ Data looks wrong</h4>
              <ul className="text-sm text-green-800 space-y-1 ml-4 list-disc">
                <li>Verify test type matches actual test performed</li>
                <li>Check laser placement (should be at correct position)</li>
                <li>Ensure athlete ran in correct direction</li>
                <li>Delete and re-record if setup was incorrect</li>
                <li>Use comparison mode to verify against previous runs</li>
              </ul>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-bold text-sm text-purple-900 mb-2">🔋 Battery issues</h4>
              <ul className="text-sm text-purple-800 space-y-1 ml-4 list-disc">
                <li>Laser unit: 8-12 hours per charge (rechargeable)</li>
                <li>Low battery indicator appears at 15%</li>
                <li>Charge using included USB-C cable</li>
                <li>Store in cool, dry place when not in use</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* Best Practices */}
      <Section id="best-practices" title="Best Practices" icon={CheckCircle}>
        <div className="space-y-4 text-[#37352F]">
          <div className="space-y-3">
            <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
              <h4 className="font-bold text-sm mb-2">📍 Environment</h4>
              <ul className="text-sm text-[#787774] space-y-1 ml-4 list-disc">
                <li>Use in clear weather conditions</li>
                <li>Avoid extreme temperatures (below 0°C or above 40°C)</li>
                <li>Minimize vibration and movement of laser mount</li>
                <li>Ensure adequate lighting (but avoid direct sun on lens)</li>
              </ul>
            </div>

            <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
              <h4 className="font-bold text-sm mb-2">🎯 Accuracy Tips</h4>
              <ul className="text-sm text-[#787774] space-y-1 ml-4 list-disc">
                <li>Always use a tripod - handheld measurements are unreliable</li>
                <li>Calibrate before each session using Sensor Check</li>
                <li>Keep laser perpendicular to athlete's path</li>
                <li>Run multiple trials for best results</li>
                <li>Record environmental conditions in session notes</li>
              </ul>
            </div>

            <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
              <h4 className="font-bold text-sm mb-2">📊 Data Management</h4>
              <ul className="text-sm text-[#787774] space-y-1 ml-4 list-disc">
                <li>Name sessions descriptively (e.g., "Monday Sprint Training - Track A")</li>
                <li>Add notes about conditions, athlete feedback, observations</li>
                <li>Export PDF reports after each session</li>
                <li>Use Analytics to track long-term progress</li>
                <li>Post personal bests to Leaderboard for motivation</li>
              </ul>
            </div>

            <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
              <h4 className="font-bold text-sm mb-2">👥 Coaching Workflow</h4>
              <ul className="text-sm text-[#787774] space-y-1 ml-4 list-disc">
                <li>Set up laser before athletes arrive</li>
                <li>Brief athletes on proper running form for tests</li>
                <li>Record warmup runs to check equipment</li>
                <li>Allow rest between maximal efforts (3-5 minutes)</li>
                <li>Review results with athletes immediately after session</li>
                <li>Share PDF reports via email or messaging</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* FAQs */}
      <Section id="faq" title="Frequently Asked Questions" icon={Book}>
        <div className="space-y-3 text-[#37352F]">
          <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
            <h4 className="font-bold text-sm mb-1">Can I use this indoors?</h4>
            <p className="text-sm text-[#787774]">
              Yes! VectorX works indoors and outdoors. For indoor use, ensure adequate distance (minimum 10m) and no reflective surfaces interfering with the beam.
            </p>
          </div>

          <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
            <h4 className="font-bold text-sm mb-1">How many athletes can I track?</h4>
            <p className="text-sm text-[#787774]">
              Unlimited! Add as many athletes as needed to your roster. Sessions can include multiple athletes, tested one at a time.
            </p>
          </div>

          <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
            <h4 className="font-bold text-sm mb-1">Does it work offline?</h4>
            <p className="text-sm text-[#787774]">
              Yes. The app works fully offline. Data syncs automatically when you reconnect to the internet. Perfect for remote training facilities.
            </p>
          </div>

          <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
            <h4 className="font-bold text-sm mb-1">Can I export data?</h4>
            <p className="text-sm text-[#787774]">
              Yes. Every session and athlete profile can be exported as a professional PDF report with graphs, split times, and performance summaries.
            </p>
          </div>

          <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
            <h4 className="font-bold text-sm mb-1">What's the maximum measurement distance?</h4>
            <p className="text-sm text-[#787774]">
              The laser can accurately measure up to 100 meters. For longer distances, position the laser at an intermediate point.
            </p>
          </div>

          <div className="bg-white border border-[#E9E9E7] rounded-lg p-4">
            <h4 className="font-bold text-sm mb-1">Is the laser safe?</h4>
            <p className="text-sm text-[#787774]">
              Absolutely. VectorX uses Class 1 infrared laser technology, which is completely eye-safe and meets all international safety standards.
            </p>
          </div>
        </div>
      </Section>

      {/* Contact Support */}
      <div className="bg-[#37352F] text-white rounded-xl p-6 mt-8">
        <h3 className="font-bold text-lg mb-2">Need More Help?</h3>
        <p className="text-sm text-gray-300 mb-4">
          Can't find what you're looking for? Our support team is here to help.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="bg-white text-[#37352F] px-4 py-2 rounded font-medium hover:bg-gray-100 transition-colors">
            Contact Support
          </button>
          <button className="border border-white text-white px-4 py-2 rounded font-medium hover:bg-white/10 transition-colors">
            Watch Video Tutorials
          </button>
        </div>
      </div>
    </div>
  );
};

export default Guide;
