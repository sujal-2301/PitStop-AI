#!/usr/bin/env python3
"""
scripts/burst_sim.py
High-accuracy burst simulation via Docker MCP Gateway
Runs simulation with 2000 Monte Carlo samples for tighter confidence bands
"""

import json
import os
import sys
import requests
from pathlib import Path

API_BASE_URL = os.getenv('API_BASE_URL', 'http://localhost:8000')
TOOL_ARGS_PATH = os.getenv('TOOL_ARGS_PATH', './artifacts/tool_args.json')
OUTPUT_PATH = './artifacts/sim_burst.json'

print('🎲 PitStop AI Burst Simulation - High Accuracy Mode')
print(f'   API: {API_BASE_URL}')
print(f'   Tool args: {TOOL_ARGS_PATH}')

def main():
    try:
        # Load tool args
        tool_args_file = Path(TOOL_ARGS_PATH)
        if not tool_args_file.exists():
            print(f'❌ Tool args not found: {TOOL_ARGS_PATH}')
            sys.exit(1)
        
        with open(tool_args_file, 'r') as f:
            tool_args = json.load(f)
        
        print(f'✅ Loaded tool args: {len(tool_args.get("candidates", []))} candidates')
        
        # Increase Monte Carlo samples for higher accuracy
        tool_args['mc_samples'] = 2000
        print(f'📈 Running with {tool_args["mc_samples"]} Monte Carlo samples...')
        
        # Call simulation API
        url = f'{API_BASE_URL}/run_sim'
        print(f'🔗 Calling: {url}')
        
        response = requests.post(url, json=tool_args, timeout=120)
        response.raise_for_status()
        
        sim_result = response.json()
        print(f'✅ Simulation complete')
        
        # Extract key metrics for confidence update
        candidates = sim_result.get('candidates', [])
        if not candidates:
            print('⚠️  No candidates in result')
            sys.exit(1)
        
        # Sort by performance
        sorted_cands = sorted(
            candidates, 
            key=lambda c: c.get('median_gap_after_5_laps', float('-inf')),
            reverse=True
        )
        
        best = sorted_cands[0]
        
        # Calculate tighter confidence from P10-P90 range
        p90 = best['p90_by_lap'][-1] if best.get('p90_by_lap') else 0
        p10 = best['p10_by_lap'][-1] if best.get('p10_by_lap') else 0
        confidence_range = abs(p90 - p10)
        
        # Higher sample count = tighter range = higher confidence
        confidence = max(75, min(98, 98 - (confidence_range * 2.5)))
        
        # Prepare burst result
        burst_result = {
            'mc_samples': 2000,
            'best_candidate': {
                'pit_lap': best['candidate']['pit_lap'],
                'compound': best['candidate']['compound'],
                'median_gap_after_5_laps': best['median_gap_after_5_laps'],
                'p10': p10,
                'p90': p90,
            },
            'confidence': round(confidence, 1),
            'confidence_range': round(confidence_range, 3),
            'improvement_vs_standard': 'Tighter confidence bands with 2000 samples',
        }
        
        # Write output
        output_file = Path(OUTPUT_PATH)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_file, 'w') as f:
            json.dump(burst_result, f, indent=2)
        
        print(f'✅ Burst result written: {OUTPUT_PATH}')
        print(f'📊 Confidence: {burst_result["confidence"]}%')
        print(f'🎯 Best: Lap {burst_result["best_candidate"]["pit_lap"]} ({burst_result["best_candidate"]["compound"]}) → {burst_result["best_candidate"]["median_gap_after_5_laps"]:.2f}s')
        print('✨ Burst simulation complete!')
        
        sys.exit(0)
        
    except requests.exceptions.RequestException as e:
        print(f'❌ API request failed: {e}')
        sys.exit(1)
    except Exception as e:
        print(f'❌ Burst simulation failed: {e}')
        sys.exit(1)

if __name__ == '__main__':
    main()

