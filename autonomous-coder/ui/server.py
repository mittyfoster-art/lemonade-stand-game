#!/usr/bin/env python3
"""
Autonomous Coder UI Server
A simple Flask web interface for the autonomous coding system.
"""

import os
import sys
import json
import sqlite3
import subprocess
import threading
import queue
from pathlib import Path
from datetime import datetime
from flask import Flask, render_template_string, jsonify, request
from flask_cors import CORS

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from features_mcp import (
    get_stats, get_category_stats, get_next_feature,
    get_feature, list_features, update_feature_status,
    add_feature, get_blocked_features, init_db, DB_PATH
)

app = Flask(__name__)
CORS(app)

# Agent process tracking
agent_process = None
agent_output = queue.Queue()
agent_running = False

HTML_TEMPLATE = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Autonomous Coder - Lemonade Stand Game</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
    <style>
        .kanban-column { min-height: 400px; }
        .feature-card { transition: all 0.2s; }
        .feature-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .debug-console { font-family: 'Monaco', 'Menlo', monospace; font-size: 12px; }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    </style>
</head>
<body class="bg-gray-900 text-white min-h-screen" x-data="autonomousCoder()">
    <!-- Header -->
    <header class="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
                <h1 class="text-2xl font-bold text-yellow-400">🍋 Autonomous Coder</h1>
                <span class="text-gray-400">Lemonade Stand Game - Multi-Factor Scoring</span>
            </div>
            <div class="flex items-center gap-4">
                <!-- Stats -->
                <div class="flex items-center gap-2 text-sm">
                    <span class="px-3 py-1 bg-green-600 rounded-full" x-text="stats.completed + ' done'"></span>
                    <span class="px-3 py-1 bg-blue-600 rounded-full" x-text="stats.in_progress + ' active'"></span>
                    <span class="px-3 py-1 bg-gray-600 rounded-full" x-text="stats.pending + ' pending'"></span>
                </div>
                <!-- Progress -->
                <div class="w-48 bg-gray-700 rounded-full h-4">
                    <div class="bg-green-500 h-4 rounded-full transition-all duration-500"
                         :style="'width: ' + stats.percent_complete + '%'"></div>
                </div>
                <span class="text-green-400 font-bold" x-text="stats.percent_complete + '%'"></span>
            </div>
        </div>
    </header>

    <div class="flex h-[calc(100vh-80px)]">
        <!-- Main Content -->
        <div class="flex-1 p-6 overflow-auto">
            <!-- Controls -->
            <div class="mb-6 flex items-center gap-4">
                <button @click="startAgent(false)"
                        :disabled="agentRunning"
                        :class="agentRunning ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'"
                        class="px-6 py-3 rounded-lg font-bold flex items-center gap-2">
                    <span x-show="!agentRunning">▶️ Start Agent</span>
                    <span x-show="agentRunning" class="pulse">🔄 Running...</span>
                </button>
                <button @click="startAgent(true)"
                        :disabled="agentRunning"
                        :class="agentRunning ? 'bg-gray-600 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-700'"
                        class="px-6 py-3 rounded-lg font-bold">
                    ⚡ YOLO Mode
                </button>
                <button @click="stopAgent()"
                        x-show="agentRunning"
                        class="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold">
                    ⏹️ Stop
                </button>
                <button @click="refreshData()"
                        class="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg">
                    🔄 Refresh
                </button>
            </div>

            <!-- Kanban Board -->
            <div class="grid grid-cols-4 gap-4">
                <!-- Pending Column -->
                <div class="kanban-column bg-gray-800 rounded-lg p-4">
                    <h2 class="text-lg font-bold mb-4 flex items-center gap-2">
                        <span class="w-3 h-3 bg-gray-500 rounded-full"></span>
                        Pending
                        <span class="text-gray-500 text-sm" x-text="'(' + pendingFeatures.length + ')'"></span>
                    </h2>
                    <div class="space-y-2 max-h-[500px] overflow-auto">
                        <template x-for="feature in pendingFeatures.slice(0, 20)" :key="feature.id">
                            <div class="feature-card bg-gray-700 rounded-lg p-3 cursor-pointer"
                                 @click="showFeature(feature.id)">
                                <div class="flex items-center justify-between mb-1">
                                    <span class="text-xs text-gray-400" x-text="feature.id"></span>
                                    <span class="text-xs px-2 py-0.5 rounded"
                                          :class="getCategoryColor(feature.category)"
                                          x-text="feature.category"></span>
                                </div>
                                <p class="text-sm font-medium" x-text="feature.title"></p>
                            </div>
                        </template>
                        <div x-show="pendingFeatures.length > 20" class="text-center text-gray-500 text-sm py-2">
                            + <span x-text="pendingFeatures.length - 20"></span> more
                        </div>
                    </div>
                </div>

                <!-- In Progress Column -->
                <div class="kanban-column bg-gray-800 rounded-lg p-4 border-2 border-blue-500">
                    <h2 class="text-lg font-bold mb-4 flex items-center gap-2">
                        <span class="w-3 h-3 bg-blue-500 rounded-full pulse"></span>
                        In Progress
                        <span class="text-gray-500 text-sm" x-text="'(' + inProgressFeatures.length + ')'"></span>
                    </h2>
                    <div class="space-y-2">
                        <template x-for="feature in inProgressFeatures" :key="feature.id">
                            <div class="feature-card bg-blue-900 border border-blue-500 rounded-lg p-3">
                                <div class="flex items-center justify-between mb-1">
                                    <span class="text-xs text-blue-300" x-text="feature.id"></span>
                                    <span class="text-xs px-2 py-0.5 rounded bg-blue-700"
                                          x-text="feature.category"></span>
                                </div>
                                <p class="text-sm font-medium" x-text="feature.title"></p>
                            </div>
                        </template>
                        <div x-show="inProgressFeatures.length === 0" class="text-gray-500 text-center py-8">
                            No features in progress
                        </div>
                    </div>
                </div>

                <!-- Completed Column -->
                <div class="kanban-column bg-gray-800 rounded-lg p-4">
                    <h2 class="text-lg font-bold mb-4 flex items-center gap-2">
                        <span class="w-3 h-3 bg-green-500 rounded-full"></span>
                        Completed
                        <span class="text-gray-500 text-sm" x-text="'(' + completedFeatures.length + ')'"></span>
                    </h2>
                    <div class="space-y-2 max-h-[500px] overflow-auto">
                        <template x-for="feature in completedFeatures.slice(0, 20)" :key="feature.id">
                            <div class="feature-card bg-green-900/50 border border-green-700 rounded-lg p-3">
                                <div class="flex items-center justify-between mb-1">
                                    <span class="text-xs text-green-400" x-text="feature.id"></span>
                                    <span class="text-green-400">✓</span>
                                </div>
                                <p class="text-sm font-medium text-green-200" x-text="feature.title"></p>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Failed/Blocked Column -->
                <div class="kanban-column bg-gray-800 rounded-lg p-4">
                    <h2 class="text-lg font-bold mb-4 flex items-center gap-2">
                        <span class="w-3 h-3 bg-red-500 rounded-full"></span>
                        Failed / Blocked
                        <span class="text-gray-500 text-sm" x-text="'(' + (failedFeatures.length + blockedFeatures.length) + ')'"></span>
                    </h2>
                    <div class="space-y-2">
                        <template x-for="feature in failedFeatures" :key="feature.id">
                            <div class="feature-card bg-red-900/50 border border-red-700 rounded-lg p-3">
                                <div class="flex items-center justify-between mb-1">
                                    <span class="text-xs text-red-400" x-text="feature.id"></span>
                                    <span class="text-red-400">✗</span>
                                </div>
                                <p class="text-sm font-medium text-red-200" x-text="feature.title"></p>
                            </div>
                        </template>
                        <template x-for="feature in blockedFeatures" :key="feature.id">
                            <div class="feature-card bg-yellow-900/50 border border-yellow-700 rounded-lg p-3">
                                <div class="flex items-center justify-between mb-1">
                                    <span class="text-xs text-yellow-400" x-text="feature.id"></span>
                                    <span class="text-yellow-400">⏸️</span>
                                </div>
                                <p class="text-sm font-medium text-yellow-200" x-text="feature.title"></p>
                            </div>
                        </template>
                    </div>
                </div>
            </div>

            <!-- Category Progress -->
            <div class="mt-6 bg-gray-800 rounded-lg p-4">
                <h3 class="text-lg font-bold mb-4">Category Progress</h3>
                <div class="grid grid-cols-7 gap-4">
                    <template x-for="cat in categoryStats" :key="cat.category">
                        <div class="text-center">
                            <div class="text-xs text-gray-400 mb-1" x-text="cat.category"></div>
                            <div class="w-full bg-gray-700 rounded-full h-2 mb-1">
                                <div class="bg-green-500 h-2 rounded-full"
                                     :style="'width: ' + cat.percent_complete + '%'"></div>
                            </div>
                            <div class="text-sm" x-text="cat.completed + '/' + cat.total"></div>
                        </div>
                    </template>
                </div>
            </div>
        </div>

        <!-- Debug Panel -->
        <div class="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div class="p-4 border-b border-gray-700 flex items-center justify-between">
                <h2 class="font-bold">Debug Console</h2>
                <button @click="clearDebug()" class="text-xs text-gray-400 hover:text-white">Clear</button>
            </div>
            <div class="flex-1 overflow-auto p-4 debug-console bg-gray-900">
                <template x-for="(line, i) in debugLog" :key="i">
                    <div class="text-gray-300 mb-1" x-html="formatDebugLine(line)"></div>
                </template>
                <div x-show="debugLog.length === 0" class="text-gray-500">
                    Agent output will appear here...
                </div>
            </div>
        </div>
    </div>

    <!-- Feature Detail Modal -->
    <div x-show="selectedFeature"
         x-transition
         class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
         @click.self="selectedFeature = null">
        <div class="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-bold" x-text="selectedFeature?.title"></h2>
                <button @click="selectedFeature = null" class="text-gray-400 hover:text-white text-2xl">&times;</button>
            </div>
            <div class="space-y-4">
                <div>
                    <span class="text-gray-400">ID:</span>
                    <span class="ml-2" x-text="selectedFeature?.id"></span>
                </div>
                <div>
                    <span class="text-gray-400">Category:</span>
                    <span class="ml-2" x-text="selectedFeature?.category"></span>
                </div>
                <div>
                    <span class="text-gray-400">Status:</span>
                    <span class="ml-2" x-text="selectedFeature?.status"></span>
                </div>
                <div>
                    <span class="text-gray-400">Description:</span>
                    <pre class="mt-2 p-3 bg-gray-900 rounded text-sm whitespace-pre-wrap" x-text="selectedFeature?.description"></pre>
                </div>
                <div x-show="selectedFeature?.files?.length">
                    <span class="text-gray-400">Files:</span>
                    <ul class="mt-2 text-sm">
                        <template x-for="file in selectedFeature?.files || []" :key="file">
                            <li class="text-blue-400" x-text="file"></li>
                        </template>
                    </ul>
                </div>
                <div x-show="selectedFeature?.acceptance_criteria?.length">
                    <span class="text-gray-400">Acceptance Criteria:</span>
                    <ul class="mt-2 text-sm list-disc list-inside">
                        <template x-for="criteria in selectedFeature?.acceptance_criteria || []" :key="criteria">
                            <li x-text="criteria"></li>
                        </template>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <script>
        function autonomousCoder() {
            return {
                stats: { total: 0, pending: 0, in_progress: 0, completed: 0, failed: 0, blocked: 0, percent_complete: 0 },
                categoryStats: [],
                features: [],
                selectedFeature: null,
                debugLog: [],
                agentRunning: false,
                pollInterval: null,

                get pendingFeatures() {
                    return this.features.filter(f => f.status === 'pending');
                },
                get inProgressFeatures() {
                    return this.features.filter(f => f.status === 'in_progress');
                },
                get completedFeatures() {
                    return this.features.filter(f => f.status === 'completed');
                },
                get failedFeatures() {
                    return this.features.filter(f => f.status === 'failed');
                },
                get blockedFeatures() {
                    return this.features.filter(f => f.status === 'blocked');
                },

                async init() {
                    await this.refreshData();
                    // Poll for updates
                    this.pollInterval = setInterval(() => {
                        this.refreshData();
                        if (this.agentRunning) {
                            this.fetchDebugLog();
                        }
                    }, 2000);
                },

                async refreshData() {
                    try {
                        const [statsRes, catRes, featuresRes] = await Promise.all([
                            fetch('/api/stats'),
                            fetch('/api/category-stats'),
                            fetch('/api/features')
                        ]);
                        this.stats = await statsRes.json();
                        this.categoryStats = await catRes.json();
                        this.features = await featuresRes.json();
                    } catch (e) {
                        console.error('Failed to refresh:', e);
                    }
                },

                async showFeature(id) {
                    try {
                        const res = await fetch(`/api/feature/${id}`);
                        this.selectedFeature = await res.json();
                    } catch (e) {
                        console.error('Failed to get feature:', e);
                    }
                },

                async startAgent(yolo = false) {
                    this.agentRunning = true;
                    this.debugLog.push(`Starting agent... (YOLO: ${yolo})`);
                    try {
                        await fetch('/api/agent/start', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ yolo })
                        });
                    } catch (e) {
                        this.debugLog.push(`Error: ${e.message}`);
                        this.agentRunning = false;
                    }
                },

                async stopAgent() {
                    try {
                        await fetch('/api/agent/stop', { method: 'POST' });
                        this.agentRunning = false;
                        this.debugLog.push('Agent stopped.');
                    } catch (e) {
                        console.error('Failed to stop agent:', e);
                    }
                },

                async fetchDebugLog() {
                    try {
                        const res = await fetch('/api/agent/output');
                        const data = await res.json();
                        if (data.output) {
                            this.debugLog.push(...data.output.split('\\n').filter(l => l.trim()));
                            // Keep only last 200 lines
                            if (this.debugLog.length > 200) {
                                this.debugLog = this.debugLog.slice(-200);
                            }
                        }
                        this.agentRunning = data.running;
                    } catch (e) {
                        console.error('Failed to fetch output:', e);
                    }
                },

                clearDebug() {
                    this.debugLog = [];
                },

                getCategoryColor(category) {
                    const colors = {
                        'DATA_MODEL': 'bg-purple-600',
                        'SCORING': 'bg-blue-600',
                        'STORE': 'bg-cyan-600',
                        'UI_SCORING': 'bg-orange-600',
                        'UI_FACILITATOR': 'bg-pink-600',
                        'LEADERBOARD': 'bg-yellow-600',
                        'TESTING': 'bg-green-600'
                    };
                    return colors[category] || 'bg-gray-600';
                },

                formatDebugLine(line) {
                    if (line.includes('Error') || line.includes('error')) {
                        return `<span class="text-red-400">${line}</span>`;
                    }
                    if (line.includes('✓') || line.includes('completed') || line.includes('Done')) {
                        return `<span class="text-green-400">${line}</span>`;
                    }
                    if (line.includes('→') || line.includes('...')) {
                        return `<span class="text-blue-400">${line}</span>`;
                    }
                    return line;
                }
            };
        }
    </script>
</body>
</html>
'''

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route('/api/stats')
def api_stats():
    return jsonify(get_stats())

@app.route('/api/category-stats')
def api_category_stats():
    return jsonify(get_category_stats())

@app.route('/api/features')
def api_features():
    return jsonify(list_features())

@app.route('/api/feature/<feature_id>')
def api_feature(feature_id):
    feature = get_feature(feature_id)
    if feature:
        return jsonify(feature)
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/agent/start', methods=['POST'])
def api_start_agent():
    global agent_process, agent_running

    if agent_running:
        return jsonify({'error': 'Agent already running'}), 400

    data = request.json or {}
    yolo = data.get('yolo', False)

    script_dir = Path(__file__).parent.parent
    script = script_dir / 'run_coding_agent.sh'

    agent_running = True

    def run_agent():
        global agent_process, agent_running
        try:
            agent_process = subprocess.Popen(
                ['bash', str(script)],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                cwd=str(script_dir.parent)
            )
            for line in agent_process.stdout:
                agent_output.put(line)
            agent_process.wait()
        except Exception as e:
            agent_output.put(f"Error: {e}")
        finally:
            agent_running = False
            agent_process = None

    thread = threading.Thread(target=run_agent, daemon=True)
    thread.start()

    return jsonify({'status': 'started'})

@app.route('/api/agent/stop', methods=['POST'])
def api_stop_agent():
    global agent_process, agent_running

    if agent_process:
        agent_process.terminate()
        agent_process = None
    agent_running = False

    return jsonify({'status': 'stopped'})

@app.route('/api/agent/output')
def api_agent_output():
    lines = []
    while not agent_output.empty():
        try:
            lines.append(agent_output.get_nowait())
        except:
            break
    return jsonify({
        'output': ''.join(lines),
        'running': agent_running
    })

if __name__ == '__main__':
    # Initialize database
    init_db()

    print("\n" + "="*50)
    print("  AUTONOMOUS CODER UI")
    print("="*50)
    print("\n  Starting server at: http://localhost:5050")
    print("\n  Press Ctrl+C to stop\n")

    app.run(host='0.0.0.0', port=5050, debug=True)
