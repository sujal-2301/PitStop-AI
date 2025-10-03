// frontend/components/AIProcessVisualization.js
import { useEffect, useState } from "react";

export default function AIProcessVisualization({ isActive, simResult }) {
  const [currentStage, setCurrentStage] = useState(0);
  const [samplesProcessed, setSamplesProcessed] = useState(0);
  const [strategiesEvaluated, setStrategiesEvaluated] = useState(0);

  const stages = [
    {
      id: 1,
      name: "LLM Planning",
      icon: "🧠",
      description: "Meta Llama analyzing your request",
      color: "from-blue-500 to-indigo-600",
      metrics: [
        "Parsing natural language",
        "Extracting pit laps & compounds",
        "Building simulation parameters",
      ],
    },
    {
      id: 2,
      name: "Monte Carlo Simulation",
      icon: "🎲",
      description: "Running probabilistic scenarios",
      color: "from-purple-500 to-pink-600",
      metrics: [
        "200-500 samples per strategy",
        "Tire degradation modeling",
        "Pit loss variance calculation",
      ],
    },
    {
      id: 3,
      name: "Statistical Analysis",
      icon: "📊",
      description: "Computing confidence intervals",
      color: "from-green-500 to-teal-600",
      metrics: [
        "P10/P50/P90 percentiles",
        "Breakeven lap detection",
        "Gap trajectory analysis",
      ],
    },
    {
      id: 4,
      name: "AI Decision Making",
      icon: "✨",
      description: "Selecting optimal strategy",
      color: "from-orange-500 to-red-600",
      metrics: [
        "Comparing all scenarios",
        "Risk assessment",
        "Generating explanation",
      ],
    },
  ];

  useEffect(() => {
    if (!isActive) {
      setCurrentStage(0);
      setSamplesProcessed(0);
      setStrategiesEvaluated(0);
      return;
    }

    // Simulate progression through stages
    const stageInterval = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < stages.length - 1) return prev + 1;
        return prev;
      });
    }, 800);

    // Simulate sample counting
    const sampleInterval = setInterval(() => {
      setSamplesProcessed((prev) => {
        const target =
          simResult?.candidates?.[0]?.p50_by_lap?.length * 200 || 400;
        if (prev < target) return Math.min(prev + 47, target);
        return target;
      });
    }, 100);

    // Simulate strategy counting
    const strategyInterval = setInterval(() => {
      setStrategiesEvaluated((prev) => {
        const target = simResult?.candidates?.length || 2;
        if (prev < target) return prev + 1;
        return target;
      });
    }, 600);

    return () => {
      clearInterval(stageInterval);
      clearInterval(sampleInterval);
      clearInterval(strategyInterval);
    };
  }, [isActive, simResult]);

  if (!isActive) return null;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl shadow-2xl p-8 border-2 border-purple-500/50">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur px-6 py-3 rounded-full mb-4">
          <div className="relative">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
          </div>
          <span className="text-white font-semibold">AI System Active</span>
        </div>
        <h3 className="text-3xl font-bold text-white mb-2">
          Real-Time Processing
        </h3>
        <p className="text-purple-200">
          Watch the AI analyze your race strategy
        </p>
      </div>

      {/* Live Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
          <div className="text-purple-200 text-xs mb-1">
            Monte Carlo Samples
          </div>
          <div className="text-3xl font-bold text-white font-mono">
            {samplesProcessed.toLocaleString()}
          </div>
          <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300"
              style={{
                width: `${Math.min((samplesProcessed / 400) * 100, 100)}%`,
              }}
            ></div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
          <div className="text-purple-200 text-xs mb-1">
            Strategies Evaluated
          </div>
          <div className="text-3xl font-bold text-white font-mono">
            {strategiesEvaluated}
          </div>
          <div className="mt-2 flex gap-1">
            {[...Array(strategiesEvaluated)].map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1 bg-green-400 rounded-full animate-pulse"
              ></div>
            ))}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
          <div className="text-purple-200 text-xs mb-1">Processing Stage</div>
          <div className="text-3xl font-bold text-white font-mono">
            {currentStage + 1}/{stages.length}
          </div>
          <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-emerald-400 transition-all duration-500"
              style={{
                width: `${((currentStage + 1) / stages.length) * 100}%`,
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Processing Stages */}
      <div className="space-y-3">
        {stages.map((stage, idx) => {
          const isActive = idx === currentStage;
          const isCompleted = idx < currentStage;

          return (
            <div
              key={stage.id}
              className={`relative overflow-hidden rounded-xl border-2 transition-all duration-500 ${
                isActive
                  ? "border-white bg-white/20 scale-[1.02] shadow-2xl"
                  : isCompleted
                  ? "border-green-400/50 bg-green-900/20"
                  : "border-white/20 bg-white/5"
              }`}
            >
              {/* Animated gradient background for active stage */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
              )}

              <div className="relative p-4">
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br ${
                      stage.color
                    } ${isActive ? "animate-bounce" : ""}`}
                  >
                    {isCompleted ? "✅" : stage.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-lg font-bold text-white">
                        {stage.name}
                      </h4>
                      {isActive && (
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          <div
                            className="w-2 h-2 bg-white rounded-full animate-pulse"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-white rounded-full animate-pulse"
                            style={{ animationDelay: "0.4s" }}
                          ></div>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-purple-200 mb-2">
                      {stage.description}
                    </p>

                    {/* Metrics - only show for active or completed */}
                    {(isActive || isCompleted) && (
                      <div className="flex flex-wrap gap-2">
                        {stage.metrics.map((metric, i) => (
                          <span
                            key={i}
                            className="text-xs bg-white/10 px-2 py-1 rounded-full text-purple-100 border border-white/20"
                          >
                            {isCompleted ? "✓" : "⋯"} {metric}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status indicator */}
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                        ✓
                      </div>
                    ) : isActive ? (
                      <div className="w-8 h-8 rounded-full border-4 border-white border-t-transparent animate-spin"></div>
                    ) : (
                      <div className="w-8 h-8 rounded-full border-2 border-white/30"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tech Stack Badge */}
      <div className="mt-8 pt-6 border-t border-white/20">
        <div className="flex items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
            <span className="text-2xl">🧠</span>
            <span className="text-white font-semibold">Meta Llama 4</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
            <span className="text-2xl">⚡</span>
            <span className="text-white font-semibold">Cerebras Inference</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
            <span className="text-2xl">🎲</span>
            <span className="text-white font-semibold">Monte Carlo Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
