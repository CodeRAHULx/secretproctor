#!/usr/bin/env node

/**
 * SecureMeet Cross-Platform Detector
 * Detects suspicious processes and windows across Windows, Linux, and macOS
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');

const execAsync = promisify(exec);

// Suspicious process patterns (AI assistants, screen capture tools, remote access)
const SUSPICIOUS_PATTERNS = [
    // AI Assistants & Code Completion
    'chatgpt',
    'copilot',
    'claude',
    'gemini',
    'bard',
    'openai',
    'anthropic',
    'cursor',
    'windsurf',
    'tabnine',
    'kite',
    'codeium',

    // Screen Recording & Capture Tools
    'obs',
    'obsstudio',
    'streamlabs',
    'xsplit',
    'bandicam',
    'camtasia',
    'snagit',
    'fraps',
    'action',
    'dxtory',
    'playclaw',
    'mirillis',

    // Remote Access Tools
    'teamviewer',
    'anydesk',
    'chrome remote',
    'remoteutilities',
    'logmein',
    'gotomypc',
    'vnc',
    'tigervnc',
    'tightvnc',
    'realvnc',
    'ultravnc',
    'nomachine',
    'parsec',
    'rustdesk',
    'dwservice',
    'supremo',

    // Virtual Machines
    'vmware',
    'virtualbox',
    'parallels',
    'qemu',
    'hyperv',
    'kvm',

    // Screen Sharing (non-legitimate)
    'screenleak',
    'scrcpy',

    // Note Taking / Second Screen Apps
    'notion',
    'obsidian',
    'roamresearch',
    'logseq',

    // Communication (when not authorized)
    'telegram',
    'whatsapp',
    'signal',
    'discord',
    'slack',

    // Browser automation / scraping
    'selenium',
    'puppeteer',
    'playwright'
];

// Known safe system processes (whitelist)
const SAFE_PROCESSES = [
    'explorer.exe',
    'dwm.exe',
    'taskmgr.exe',
    'svchost.exe',
    'system',
    'registry',
    'csrss.exe',
    'wininit.exe',
    'services.exe',
    'lsass.exe',
    'winlogon.exe',
    'fontdrvhost.exe',
    'conhost.exe',
    'runtimebroker.exe',
    'sihost.exe',
    'taskhostw.exe',
    'dllhost.exe',
    'searchindexer.exe',
    'startmenuexperiencehost.exe',
    'shellexperiencehost.exe',
    'applicationframehost.exe',
    'systemsettings.exe',

    // Linux/macOS
    'systemd',
    'init',
    'kworker',
    'kernel_task',
    'launchd',
    'WindowServer',
    'Dock',
    'Finder',
    'loginwindow',
    'UserEventAgent',
    'cfprefsd',
    'coreservicesd',

    // Browsers (allowed)
    'chrome.exe',
    'firefox.exe',
    'msedge.exe',
    'safari',
    'brave.exe',

    // Development (allowed for developer mode)
    'node.exe',
    'code.exe',
    'python.exe',
    'git.exe'
];

/**
 * Get running processes on Windows
 */
async function getProcessesWindows() {
    try {
        const { stdout } = await execAsync('tasklist /FO CSV /NH', { encoding: 'utf8' });
        const lines = stdout.trim().split('\n');

        return lines.map(line => {
            const match = line.match(/"([^"]+)","(\d+)"/);
            if (match) {
                return {
                    name: match[1],
                    pid: parseInt(match[2]),
                    platform: 'windows'
                };
            }
            return null;
        }).filter(Boolean);
    } catch (error) {
        console.error('Error getting Windows processes:', error.message);
        return [];
    }
}

/**
 * Get running processes on Linux
 */
async function getProcessesLinux() {
    try {
        const { stdout } = await execAsync('ps -eo pid,comm', { encoding: 'utf8' });
        const lines = stdout.trim().split('\n').slice(1); // Skip header

        return lines.map(line => {
            const match = line.trim().match(/^(\d+)\s+(.+)$/);
            if (match) {
                return {
                    name: match[2],
                    pid: parseInt(match[1]),
                    platform: 'linux'
                };
            }
            return null;
        }).filter(Boolean);
    } catch (error) {
        console.error('Error getting Linux processes:', error.message);
        return [];
    }
}

/**
 * Get running processes on macOS
 */
async function getProcessesMacOS() {
    try {
        const { stdout } = await execAsync('ps -eo pid,comm', { encoding: 'utf8' });
        const lines = stdout.trim().split('\n').slice(1); // Skip header

        return lines.map(line => {
            const match = line.trim().match(/^(\d+)\s+(.+)$/);
            if (match) {
                return {
                    name: match[2],
                    pid: parseInt(match[1]),
                    platform: 'darwin'
                };
            }
            return null;
        }).filter(Boolean);
    } catch (error) {
        console.error('Error getting macOS processes:', error.message);
        return [];
    }
}

/**
 * Get all running processes based on platform
 */
async function getAllProcesses() {
    const platform = os.platform();

    switch (platform) {
        case 'win32':
            return await getProcessesWindows();
        case 'linux':
            return await getProcessesLinux();
        case 'darwin':
            return await getProcessesMacOS();
        default:
            console.error(`Unsupported platform: ${platform}`);
            return [];
    }
}

/**
 * Check if process name matches suspicious patterns
 */
function isSuspicious(processName) {
    const lowerName = processName.toLowerCase();

    // Check whitelist first
    for (const safe of SAFE_PROCESSES) {
        if (lowerName.includes(safe.toLowerCase())) {
            return false;
        }
    }

    // Check suspicious patterns
    for (const pattern of SUSPICIOUS_PATTERNS) {
        if (lowerName.includes(pattern.toLowerCase())) {
            return true;
        }
    }

    return false;
}

/**
 * Get reason for flagging a process
 */
function getThreatReason(processName) {
    const lowerName = processName.toLowerCase();

    if (lowerName.includes('chatgpt') || lowerName.includes('claude') ||
        lowerName.includes('gemini') || lowerName.includes('copilot') ||
        lowerName.includes('bard') || lowerName.includes('openai')) {
        return 'AI_ASSISTANT: Potential unauthorized AI assistant detected';
    }

    if (lowerName.includes('obs') || lowerName.includes('streamlabs') ||
        lowerName.includes('bandicam') || lowerName.includes('camtasia')) {
        return 'SCREEN_RECORDING: Screen recording software detected';
    }

    if (lowerName.includes('teamviewer') || lowerName.includes('anydesk') ||
        lowerName.includes('vnc') || lowerName.includes('remote')) {
        return 'REMOTE_ACCESS: Remote access software detected';
    }

    if (lowerName.includes('vmware') || lowerName.includes('virtualbox') ||
        lowerName.includes('parallels') || lowerName.includes('qemu')) {
        return 'VIRTUAL_MACHINE: Virtual machine software detected';
    }

    if (lowerName.includes('telegram') || lowerName.includes('whatsapp') ||
        lowerName.includes('signal') || lowerName.includes('discord')) {
        return 'COMMUNICATION: Unauthorized communication app detected';
    }

    return 'SUSPICIOUS_PROCESS: Potentially unauthorized software detected';
}

/**
 * Detect threats
 */
async function detectThreats() {
    const processes = await getAllProcesses();
    const threats = [];

    for (const proc of processes) {
        if (isSuspicious(proc.name)) {
            threats.push({
                hwnd: `0x${proc.pid.toString(16).padStart(8, '0')}`,
                pid: proc.pid,
                path: proc.name,
                title: proc.name,
                className: proc.platform,
                affinity: 'PROCESS_DETECTED',
                affinityCode: 1,
                isVisible: true,
                isTopmost: false,
                width: 0,
                height: 0,
                reason: getThreatReason(proc.name),
                platform: proc.platform
            });
        }
    }

    return threats;
}

/**
 * Print JSON output
 */
function printJSON(threats) {
    const output = {
        threatCount: threats.length,
        threats: threats,
        timestamp: new Date().toISOString(),
        platform: os.platform(),
        arch: os.arch(),
        detectorVersion: '2.0.0-crossplatform'
    };

    console.log(JSON.stringify(output));
}

/**
 * Print text output
 */
function printText(threats) {
    console.log('================================================================================');
    console.log('         SECUREMEET CROSS-PLATFORM PROCESS DETECTOR SCAN RESULT                ');
    console.log('================================================================================');
    console.log(`Platform: ${os.platform()} (${os.arch()})`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('================================================================================');
    console.log('');

    if (threats.length === 0) {
        console.log('[OK] No suspicious processes detected.');
    } else {
        console.log(`[!] ALERT: Detected ${threats.length} suspicious process(es):`);
        console.log('');

        threats.forEach((threat, index) => {
            console.log(`--- [ SUSPICIOUS PROCESS #${index + 1} ] ---`);
            console.log(`  Process Name       : ${threat.path}`);
            console.log(`  Process ID (PID)   : ${threat.pid}`);
            console.log(`  Platform           : ${threat.platform}`);
            console.log(`  Reason             : ${threat.reason}`);
            console.log('');
        });
    }

    console.log('================================================================================');
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);
    const jsonOutput = args.includes('--json');
    const showHelp = args.includes('--help') || args.includes('-h');

    if (showHelp) {
        console.log('SecureMeet Cross-Platform Detector');
        console.log('');
        console.log('Usage: node detector.js [options]');
        console.log('');
        console.log('Options:');
        console.log('  --json        Output in JSON format');
        console.log('  --help, -h    Show this help message');
        console.log('');
        console.log('Supported Platforms: Windows, Linux, macOS');
        return;
    }

    try {
        const threats = await detectThreats();

        if (jsonOutput) {
            printJSON(threats);
        } else {
            printText(threats);
        }

        // Exit code: 0 if no threats, 1 if threats detected
        process.exit(threats.length > 0 ? 1 : 0);
    } catch (error) {
        console.error('Error running detector:', error.message);
        process.exit(2);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

// Export for use as module
module.exports = {
    detectThreats,
    getAllProcesses,
    isSuspicious,
    getThreatReason
};
