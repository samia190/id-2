// ============================================================
// INFINITE EVOLVING MULTIVERSE ENGINE
// Procedural universe generation with phase transitions
// Never repeats — infinite evolution with randomized seeds
// ============================================================

(function() {
    'use strict';

    var canvas = document.getElementById('multiverseCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    var W, H, cx, cy;
    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
        cx = W / 2;
        cy = H / 2;
    }
    resize();
    window.addEventListener('resize', resize);

    // Time tracking
    var time = 0;
    var deltaTime = 0;
    var lastTime = performance.now();

    // ===== SEEDED RANDOM FOR NON-REPETITION =====
    var universeSeed = Date.now() % 100000;
    var cycleCount = 0;

    function srand(n) {
        var s = Math.sin(n * 127.1 + universeSeed * 311.7) * 43758.5453;
        return s - Math.floor(s);
    }

    // ===== HSL HELPER =====
    function hsl(h, s, l, a) {
        return 'hsla(' + (((h % 360) + 360) % 360) + ',' + s + '%,' + l + '%,' + (a !== undefined ? a : 1) + ')';
    }

    // ===== PROCEDURAL COLOR PALETTE =====
    var palette = {};

    function regeneratePalette() {
        var baseHue = srand(cycleCount * 77.7) * 360;
        palette = {
            h1: baseHue,
            h2: (baseHue + 60 + srand(cycleCount * 13.3) * 60) % 360,
            h3: (baseHue + 150 + srand(cycleCount * 29.1) * 60) % 360,
            h4: (baseHue + 210 + srand(cycleCount * 41.7) * 60) % 360,
            sat: 65 + srand(cycleCount * 53.9) * 25,
            lit: 55 + srand(cycleCount * 67.3) * 15
        };
    }
    regeneratePalette();

    // ===== PHASE SYSTEM =====
    var PHASE_COUNT = 7;
    var PHASE_NAMES = ['genesis', 'expansion', 'complexity', 'instability', 'eruption', 'portal', 'rebirth'];
    var PHASE_DURATIONS = [2, 2, 2, 2, 2, 2, 2]; // seconds

    var phase = 0;
    var phaseTime = 0;
    var phaseProgress = 0;
    var flashAlpha = 0;

    function advancePhase() {
        phase = (phase + 1) % PHASE_COUNT;
        phaseTime = 0;
        phaseProgress = 0;
        flashAlpha = 1.0;

        if (phase === 0) {
            // New cycle — regenerate everything with new seed
            cycleCount++;
            universeSeed = Date.now() % 100000 + cycleCount * 7919;
            regeneratePalette();
            resetAttractor();
            resetNetwork();
            resetFractal();
        }

        // Trigger CSS overlay effects based on phase
        var portalOverlay = document.getElementById('portalOverlay');
        var glitchOverlay = document.getElementById('glitchOverlay');

        if (portalOverlay) {
            if (phase === 5) portalOverlay.classList.add('active');
            else portalOverlay.classList.remove('active');
        }
        if (glitchOverlay) {
            if (phase === 3) glitchOverlay.classList.add('active');
            else glitchOverlay.classList.remove('active');
        }
    }

    // ========================================================================
    // LAYER 1: STRANGE ATTRACTOR — Lorenz / Rössler / Halvorsen
    // ========================================================================
    var ATTRACTOR_COUNT = 150;
    var attractorParticles = [];
    var attractorType = 0;

    function resetAttractor() {
        attractorType = Math.floor(srand(cycleCount * 11.1 + phase) * 3);
        attractorParticles = [];
        for (var i = 0; i < ATTRACTOR_COUNT; i++) {
            attractorParticles.push({
                x: (srand(i * 1.1 + cycleCount * 3.7) - 0.5) * 2,
                y: (srand(i * 2.2 + cycleCount * 5.3) - 0.5) * 2,
                z: (srand(i * 3.3 + cycleCount * 7.1) - 0.5) * 2,
                trail: [],
                hueOff: srand(i * 4.4) * 60
            });
        }
    }
    resetAttractor();

    function updateAttractor(p) {
        var s = deltaTime * 0.5;
        var dx, dy, dz;

        if (attractorType === 0) {
            // Lorenz
            dx = 10 * (p.y - p.x);
            dy = p.x * (28 - p.z) - p.y;
            dz = p.x * p.y - (8 / 3) * p.z;
        } else if (attractorType === 1) {
            // Rössler
            dx = -(p.y + p.z);
            dy = p.x + 0.2 * p.y;
            dz = 0.2 + p.z * (p.x - 5.7);
        } else {
            // Halvorsen
            var a = 1.89;
            dx = -a * p.x - 4 * p.y - 4 * p.z - p.y * p.y;
            dy = -a * p.y - 4 * p.z - 4 * p.x - p.z * p.z;
            dz = -a * p.z - 4 * p.x - 4 * p.y - p.x * p.x;
        }

        p.x += dx * s;
        p.y += dy * s;
        p.z += dz * s;

        // Clamp to prevent explosion
        if (Math.abs(p.x) > 100 || Math.abs(p.y) > 100 || Math.abs(p.z) > 100) {
            p.x = (srand(time * 0.01 + p.hueOff) - 0.5) * 2;
            p.y = (srand(time * 0.01 + p.hueOff + 1) - 0.5) * 2;
            p.z = (srand(time * 0.01 + p.hueOff + 2) - 0.5) * 2;
            p.trail = [];
        }
    }

    function drawAttractor(intensity) {
        if (intensity <= 0) return;
        var scale = Math.min(W, H) * 0.008;

        ctx.globalAlpha = intensity * 0.8;

        for (var i = 0; i < ATTRACTOR_COUNT; i++) {
            var p = attractorParticles[i];
            updateAttractor(p);

            // Project 3D to 2D
            var perspective = 1 / (1 + p.z * 0.02);
            var sx = cx + p.x * scale * perspective;
            var sy = cy + p.y * scale * perspective;

            // Store trail
            p.trail.push({ x: sx, y: sy });
            if (p.trail.length > 20) p.trail.shift();

            // Draw trail
            if (p.trail.length > 2) {
                ctx.beginPath();
                ctx.moveTo(p.trail[0].x, p.trail[0].y);
                for (var j = 1; j < p.trail.length; j++) {
                    ctx.lineTo(p.trail[j].x, p.trail[j].y);
                }
                ctx.strokeStyle = hsl(palette.h1 + p.hueOff, palette.sat, palette.lit, 0.3 * intensity);
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Draw particle
            ctx.beginPath();
            ctx.arc(sx, sy, 1.5 * perspective, 0, Math.PI * 2);
            ctx.fillStyle = hsl(palette.h1 + p.hueOff, palette.sat, palette.lit + 10, 0.7 * intensity);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    }

    // ========================================================================
    // LAYER 2: NEURAL NETWORK — connected pulsing nodes
    // ========================================================================
    var NETWORK_NODES = 35;
    var networkNodes = [];
    var CONNECT_DIST = 180;

    function resetNetwork() {
        networkNodes = [];
        for (var i = 0; i < NETWORK_NODES; i++) {
            networkNodes.push({
                x: srand(i * 7.7 + cycleCount * 3.1) * W,
                y: srand(i * 11.3 + cycleCount * 5.9) * H,
                vx: (srand(i * 13.1 + cycleCount * 7.3) - 0.5) * 0.8,
                vy: (srand(i * 17.7 + cycleCount * 11.1) - 0.5) * 0.8,
                size: 2 + srand(i * 19.9) * 3,
                pulse: srand(i * 23.3) * Math.PI * 2,
                hueOff: srand(i * 29.1) * 120
            });
        }
    }
    resetNetwork();

    function drawNetwork(intensity) {
        if (intensity <= 0) return;

        ctx.globalAlpha = intensity;

        // Update positions
        for (var i = 0; i < NETWORK_NODES; i++) {
            var n = networkNodes[i];
            n.x += n.vx;
            n.y += n.vy;
            n.pulse += 0.02;

            if (n.x < 0 || n.x > W) n.vx *= -1;
            if (n.y < 0 || n.y > H) n.vy *= -1;
            n.x = Math.max(0, Math.min(W, n.x));
            n.y = Math.max(0, Math.min(H, n.y));
        }

        // Draw connections
        for (var i = 0; i < NETWORK_NODES; i++) {
            for (var j = i + 1; j < NETWORK_NODES; j++) {
                var dx = networkNodes[i].x - networkNodes[j].x;
                var dy = networkNodes[i].y - networkNodes[j].y;
                var dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < CONNECT_DIST) {
                    var alpha = (1 - dist / CONNECT_DIST) * 0.4 * intensity;
                    var pulse = 0.5 + 0.5 * Math.sin(time * 2 + i * 0.5);

                    ctx.beginPath();
                    ctx.moveTo(networkNodes[i].x, networkNodes[i].y);
                    ctx.lineTo(networkNodes[j].x, networkNodes[j].y);
                    ctx.strokeStyle = hsl(palette.h2 + networkNodes[i].hueOff * 0.5, palette.sat - 10, palette.lit, alpha * pulse);
                    ctx.lineWidth = 0.8;
                    ctx.stroke();

                    // Data pulse along connection
                    if (pulse > 0.85) {
                        var t = (time * 3 + i) % 1;
                        var px = networkNodes[i].x + (networkNodes[j].x - networkNodes[i].x) * t;
                        var py = networkNodes[i].y + (networkNodes[j].y - networkNodes[i].y) * t;
                        ctx.beginPath();
                        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
                        ctx.fillStyle = hsl(palette.h3, 90, 70, alpha * 2);
                        ctx.fill();
                    }
                }
            }
        }

        // Draw nodes
        for (var i = 0; i < NETWORK_NODES; i++) {
            var n = networkNodes[i];
            var glow = 0.5 + 0.5 * Math.sin(n.pulse);

            // Glow
            ctx.beginPath();
            var grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.size * 4);
            grad.addColorStop(0, hsl(palette.h2 + n.hueOff, palette.sat, palette.lit, 0.3 * glow * intensity));
            grad.addColorStop(1, hsl(palette.h2 + n.hueOff, palette.sat, palette.lit, 0));
            ctx.fillStyle = grad;
            ctx.arc(n.x, n.y, n.size * 4, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.size * (0.8 + glow * 0.4), 0, Math.PI * 2);
            ctx.fillStyle = hsl(palette.h2 + n.hueOff, palette.sat, palette.lit + 15, 0.8 * intensity);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    }

    // ========================================================================
    // LAYER 3: COSMIC LIGHTNING — branching arc system
    // ========================================================================
    var bolts = [];
    var boltTimer = 0;
    var BOLT_INTERVAL = 3;

    function generateBolt(sx, sy, ex, ey, depth) {
        var segments = [];
        var steps = 8 + Math.floor(Math.random() * 8);
        var x, y;

        for (var i = 0; i <= steps; i++) {
            var t = i / steps;
            var tx = sx + (ex - sx) * t;
            var ty = sy + (ey - sy) * t;

            if (i > 0 && i < steps) {
                x = tx + (Math.random() - 0.5) * 80 * (1 - depth * 0.3);
                y = ty + (Math.random() - 0.5) * 80 * (1 - depth * 0.3);
            } else {
                x = tx;
                y = ty;
            }
            segments.push({ x: x, y: y });
        }

        bolts.push({
            segments: segments,
            alpha: 1,
            width: 3 - depth,
            hue: palette.h3 + Math.random() * 40
        });

        // Branch
        if (depth < 2 && Math.random() > 0.4) {
            var branchIdx = Math.floor(Math.random() * (segments.length - 2)) + 1;
            var bs = segments[branchIdx];
            var angle = Math.atan2(ey - sy, ex - sx) + (Math.random() - 0.5) * 1.5;
            var len = 50 + Math.random() * 100;
            generateBolt(bs.x, bs.y, bs.x + Math.cos(angle) * len, bs.y + Math.sin(angle) * len, depth + 1);
        }
    }

    function drawLightning(intensity) {
        if (intensity <= 0) return;

        boltTimer += deltaTime;
        if (boltTimer > BOLT_INTERVAL * (0.3 + Math.random() * 0.7)) {
            var startX = Math.random() * W;
            var startY = Math.random() * H * 0.3;
            var endX = startX + (Math.random() - 0.5) * 300;
            var endY = startY + 200 + Math.random() * 300;
            generateBolt(startX, startY, endX, endY, 0);
            boltTimer = 0;
        }

        ctx.globalAlpha = intensity;

        for (var b = bolts.length - 1; b >= 0; b--) {
            var bolt = bolts[b];
            bolt.alpha -= deltaTime * 1.5;

            if (bolt.alpha <= 0) {
                bolts.splice(b, 1);
                continue;
            }

            // Glow pass
            ctx.beginPath();
            ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
            for (var i = 1; i < bolt.segments.length; i++) {
                ctx.lineTo(bolt.segments[i].x, bolt.segments[i].y);
            }
            ctx.strokeStyle = hsl(bolt.hue, 80, 80, bolt.alpha * 0.3 * intensity);
            ctx.lineWidth = bolt.width * 4;
            ctx.stroke();

            // Core pass
            ctx.beginPath();
            ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
            for (var i = 1; i < bolt.segments.length; i++) {
                ctx.lineTo(bolt.segments[i].x, bolt.segments[i].y);
            }
            ctx.strokeStyle = hsl(bolt.hue, 30, 95, bolt.alpha * 0.8 * intensity);
            ctx.lineWidth = bolt.width;
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    }

    // ========================================================================
    // LAYER 4: MIRROR TUNNEL — concentric zooming rings
    // ========================================================================
    function drawTunnel(intensity) {
        if (intensity <= 0) return;

        ctx.globalAlpha = intensity * 0.5;
        var rings = 15;
        var maxSize = Math.max(W, H) * 0.8;

        for (var i = 0; i < rings; i++) {
            var t = ((time * 0.5 + i / rings) % 1);
            var size = t * maxSize;
            var alpha = (1 - t) * 0.4 * intensity;
            var rotation = time * 0.3 + i * 0.2;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rotation);

            ctx.beginPath();
            var wobble = 1 + Math.sin(time * 2 + i) * 0.1;
            ctx.ellipse(0, 0, size * wobble, size / wobble, 0, 0, Math.PI * 2);
            ctx.strokeStyle = hsl(palette.h4 + i * 15, palette.sat, palette.lit, alpha);
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.restore();
        }

        ctx.globalAlpha = 1;
    }

    // ========================================================================
    // LAYER 5: HYPERCUBE (4D TESSERACT) — rotating wireframe
    // ========================================================================
    var hypercubeVertices4D = [];
    for (var i = 0; i < 16; i++) {
        hypercubeVertices4D.push([
            (i & 1) ? 1 : -1,
            (i & 2) ? 1 : -1,
            (i & 4) ? 1 : -1,
            (i & 8) ? 1 : -1
        ]);
    }

    var hypercubeEdges = [];
    for (var i = 0; i < 16; i++) {
        for (var j = i + 1; j < 16; j++) {
            var diff = 0;
            for (var k = 0; k < 4; k++) {
                if (hypercubeVertices4D[i][k] !== hypercubeVertices4D[j][k]) diff++;
            }
            if (diff === 1) hypercubeEdges.push([i, j]);
        }
    }

    function rotateXW(v, angle) {
        var c = Math.cos(angle), s = Math.sin(angle);
        return [v[0] * c - v[3] * s, v[1], v[2], v[0] * s + v[3] * c];
    }
    function rotateYZ(v, angle) {
        var c = Math.cos(angle), s = Math.sin(angle);
        return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c, v[3]];
    }
    function rotateXY(v, angle) {
        var c = Math.cos(angle), s = Math.sin(angle);
        return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2], v[3]];
    }

    function drawHypercube(intensity) {
        if (intensity <= 0) return;

        var scale = Math.min(W, H) * 0.12;
        var projected = [];

        for (var i = 0; i < 16; i++) {
            var v = hypercubeVertices4D[i].slice();

            v = rotateXW(v, time * 0.4);
            v = rotateYZ(v, time * 0.3);
            v = rotateXY(v, time * 0.2);

            // 4D → 3D perspective
            var w4 = 1 / (3 - v[3]);
            var x3 = v[0] * w4;
            var y3 = v[1] * w4;
            var z3 = v[2] * w4;

            // 3D → 2D perspective
            var w3 = 1 / (3 - z3);
            var sx = cx + x3 * scale * w3;
            var sy = cy + y3 * scale * w3;

            projected.push({ x: sx, y: sy, depth: z3 + v[3] });
        }

        ctx.globalAlpha = intensity * 0.6;

        // Edges
        for (var e = 0; e < hypercubeEdges.length; e++) {
            var a = hypercubeEdges[e][0], b = hypercubeEdges[e][1];
            var avgDepth = (projected[a].depth + projected[b].depth) * 0.5;
            var alpha = 0.3 + avgDepth * 0.15;

            ctx.beginPath();
            ctx.moveTo(projected[a].x, projected[a].y);
            ctx.lineTo(projected[b].x, projected[b].y);
            ctx.strokeStyle = hsl(palette.h3 + avgDepth * 30, palette.sat, palette.lit, Math.max(0.1, alpha) * intensity);
            ctx.lineWidth = 1 + avgDepth * 0.3;
            ctx.stroke();
        }

        // Vertices
        for (var i = 0; i < 16; i++) {
            var p = projected[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2 + p.depth * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = hsl(palette.h3, palette.sat, palette.lit + 20, 0.6 * intensity);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    }

    // ========================================================================
    // LAYER 6: FRACTAL TREE — recursive branching structure
    // ========================================================================
    var fractalSeed = 0;

    function resetFractal() {
        fractalSeed = srand(cycleCount * 31.7) * 1000;
    }
    resetFractal();

    function drawBranch(x, y, len, angle, depth, maxDepth, intensity) {
        if (depth > maxDepth || len < 3) return;

        var ex = x + Math.cos(angle) * len;
        var ey = y + Math.sin(angle) * len;

        var alpha = (1 - depth / maxDepth) * 0.5 * intensity;
        var hue = palette.h1 + depth * 25 + fractalSeed;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = hsl(hue, palette.sat, palette.lit, alpha);
        ctx.lineWidth = Math.max(0.5, (maxDepth - depth) * 0.8);
        ctx.stroke();

        // Tip glow at leaf nodes
        if (depth === maxDepth - 1 || len < 8) {
            ctx.beginPath();
            ctx.arc(ex, ey, 2, 0, Math.PI * 2);
            ctx.fillStyle = hsl(hue + 60, 90, 70, alpha * 0.8);
            ctx.fill();
        }

        var spread = 0.4 + Math.sin(time * 0.5 + depth) * 0.15;
        var shrink = 0.65 + srand(fractalSeed + depth * 7.1) * 0.1;

        drawBranch(ex, ey, len * shrink, angle - spread, depth + 1, maxDepth, intensity);
        drawBranch(ex, ey, len * shrink, angle + spread, depth + 1, maxDepth, intensity);

        // Extra branch occasionally
        if (srand(fractalSeed + depth * 13.3) > 0.6) {
            drawBranch(ex, ey, len * shrink * 0.8, angle + spread * 0.3, depth + 1, maxDepth, intensity);
        }
    }

    function drawFractal(intensity) {
        if (intensity <= 0) return;

        ctx.globalAlpha = intensity;

        var treeX = cx + Math.sin(time * 0.2) * 100;
        var treeY = H * 0.85;
        var maxDepth = 8;
        var baseLen = Math.min(W, H) * 0.15;

        drawBranch(treeX, treeY, baseLen, -Math.PI / 2 + Math.sin(time * 0.3) * 0.1, 0, maxDepth, intensity);

        ctx.globalAlpha = 1;
    }

    // ========================================================================
    // LAYER 7: ENERGY AURA — orbiting particles around center
    // ========================================================================
    var AURA_COUNT = 60;
    var auraParticles = [];

    for (var i = 0; i < AURA_COUNT; i++) {
        auraParticles.push({
            angle: (Math.PI * 2 / AURA_COUNT) * i,
            radius: 80 + Math.random() * 60,
            speed: 0.3 + Math.random() * 0.4,
            size: 1 + Math.random() * 2,
            hueOff: Math.random() * 90,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: 0.5 + Math.random() * 1
        });
    }

    function drawAura(intensity) {
        if (intensity <= 0) return;

        ctx.globalAlpha = intensity;

        for (var i = 0; i < AURA_COUNT; i++) {
            var a = auraParticles[i];
            a.angle += a.speed * deltaTime;
            a.wobble += a.wobbleSpeed * deltaTime;

            var r = a.radius + Math.sin(a.wobble) * 20;
            var x = cx + Math.cos(a.angle) * r;
            var y = cy + Math.sin(a.angle) * r;

            // Glow
            ctx.beginPath();
            var grad = ctx.createRadialGradient(x, y, 0, x, y, a.size * 5);
            grad.addColorStop(0, hsl(palette.h1 + a.hueOff, 80, 70, 0.4 * intensity));
            grad.addColorStop(1, hsl(palette.h1 + a.hueOff, 80, 70, 0));
            ctx.fillStyle = grad;
            ctx.arc(x, y, a.size * 5, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.beginPath();
            ctx.arc(x, y, a.size, 0, Math.PI * 2);
            ctx.fillStyle = hsl(palette.h1 + a.hueOff, 60, 90, 0.8 * intensity);
            ctx.fill();
        }

        // Connect adjacent aura particles
        for (var i = 0; i < AURA_COUNT; i++) {
            var a1 = auraParticles[i];
            var r1 = a1.radius + Math.sin(a1.wobble) * 20;
            var x1 = cx + Math.cos(a1.angle) * r1;
            var y1 = cy + Math.sin(a1.angle) * r1;

            var next = (i + 1) % AURA_COUNT;
            var a2 = auraParticles[next];
            var r2 = a2.radius + Math.sin(a2.wobble) * 20;
            var x2 = cx + Math.cos(a2.angle) * r2;
            var y2 = cy + Math.sin(a2.angle) * r2;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = hsl(palette.h1, palette.sat, palette.lit, 0.1 * intensity);
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    }

    // ========================================================================
    // LAYER 8: SPACE FABRIC — gravitationally warped grid
    // ========================================================================
    function drawGrid(intensity) {
        if (intensity <= 0) return;

        ctx.globalAlpha = intensity * 0.3;

        var gridSize = 50;
        var cols = Math.ceil(W / gridSize) + 2;
        var rows = Math.ceil(H / gridSize) + 2;

        ctx.strokeStyle = hsl(palette.h4, 30, 50, 0.2 * intensity);
        ctx.lineWidth = 0.5;

        // Horizontal lines with gravitational warp
        for (var r = 0; r < rows; r++) {
            ctx.beginPath();
            for (var c = 0; c <= cols; c++) {
                var x = c * gridSize;
                var y = r * gridSize;

                var dx = x - cx;
                var dy = y - cy;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var warp = 200 / (dist + 100);

                var wx = x + Math.sin(y * 0.02 + time) * warp * 15;
                var wy = y + Math.cos(x * 0.02 + time * 0.7) * warp * 15;

                if (c === 0) ctx.moveTo(wx, wy);
                else ctx.lineTo(wx, wy);
            }
            ctx.stroke();
        }

        // Vertical lines with gravitational warp
        for (var c = 0; c < cols; c++) {
            ctx.beginPath();
            for (var r = 0; r <= rows; r++) {
                var x = c * gridSize;
                var y = r * gridSize;

                var dx = x - cx;
                var dy = y - cy;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var warp = 200 / (dist + 100);

                var wx = x + Math.sin(y * 0.02 + time) * warp * 15;
                var wy = y + Math.cos(x * 0.02 + time * 0.7) * warp * 15;

                if (r === 0) ctx.moveTo(wx, wy);
                else ctx.lineTo(wx, wy);
            }
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    }

    // ========================================================================
    // LAYER 9: QUANTUM FLICKER — random glitch rectangles & scanlines
    // ========================================================================
    function drawGlitch(intensity) {
        if (intensity <= 0) return;

        ctx.globalAlpha = intensity;

        var count = 5 + Math.floor(Math.random() * 10);
        for (var i = 0; i < count; i++) {
            if (Math.random() > 0.3) continue;

            var x = Math.random() * W;
            var y = Math.random() * H;
            var w = 20 + Math.random() * 100;
            var h = 2 + Math.random() * 8;

            ctx.fillStyle = hsl(palette.h3 + Math.random() * 60, 90, 70, Math.random() * 0.15 * intensity);
            ctx.fillRect(x, y, w, h);
        }

        // Scanlines
        if (Math.random() > 0.7) {
            var y = Math.random() * H;
            ctx.fillStyle = hsl(palette.h1, 90, 80, 0.05 * intensity);
            ctx.fillRect(0, y, W, 2);
        }

        ctx.globalAlpha = 1;
    }

    // ========================================================================
    // LAYER 10: GRAVITATIONAL LENS — radial distortion near center
    // ========================================================================
    function drawGravitationalLens(intensity) {
        if (intensity <= 0) return;

        ctx.globalAlpha = intensity * 0.4;

        // Concentric distortion rings
        var maxRadius = Math.min(W, H) * 0.25;
        var ringCount = 8;

        for (var i = 0; i < ringCount; i++) {
            var r = maxRadius * (i / ringCount);
            var wobble = Math.sin(time * 1.5 + i * 0.8) * 5;
            var alpha = (1 - i / ringCount) * 0.3 * intensity;

            ctx.beginPath();
            ctx.arc(cx, cy, r + wobble, 0, Math.PI * 2);
            ctx.strokeStyle = hsl(palette.h2 + i * 20, palette.sat, palette.lit + 10, alpha);
            ctx.lineWidth = 2 - i * 0.15;
            ctx.stroke();
        }

        // Central gravity well glow
        var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius * 0.6);
        grad.addColorStop(0, hsl(palette.h1, palette.sat, palette.lit, 0.08 * intensity));
        grad.addColorStop(0.5, hsl(palette.h2, palette.sat, palette.lit, 0.03 * intensity));
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, maxRadius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
    }

    // ========================================================================
    // LAYER 11: DIMENSIONAL PORTAL — spiral vortex
    // ========================================================================
    function drawPortal(intensity) {
        if (intensity <= 0) return;

        ctx.globalAlpha = intensity * 0.5;

        var arms = 5;
        var maxRadius = Math.min(W, H) * 0.35;

        for (var arm = 0; arm < arms; arm++) {
            ctx.beginPath();
            var baseAngle = (Math.PI * 2 / arms) * arm + time * 0.5;

            for (var t = 0; t < 100; t++) {
                var s = t / 100;
                var radius = s * maxRadius;
                var angle = baseAngle + s * 4 * Math.PI + Math.sin(s * 3 + time) * 0.3;
                var x = cx + Math.cos(angle) * radius;
                var y = cy + Math.sin(angle) * radius;

                if (t === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }

            ctx.strokeStyle = hsl(palette.h4 + arm * 30, palette.sat, palette.lit, 0.3 * intensity * (0.5 + 0.5 * Math.sin(time + arm)));
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    }

    // ========================================================================
    // LAYER 12: COSMIC NEBULA WISPS — flowing energy fog
    // ========================================================================
    var WISP_COUNT = 25;
    var wisps = [];

    for (var i = 0; i < WISP_COUNT; i++) {
        wisps.push({
            x: Math.random() * 2000 - 500,
            y: Math.random() * 2000 - 500,
            size: 30 + Math.random() * 80,
            speedX: (Math.random() - 0.5) * 0.3,
            speedY: (Math.random() - 0.5) * 0.2,
            hueOff: Math.random() * 120,
            alpha: 0.02 + Math.random() * 0.04,
            phase: Math.random() * Math.PI * 2
        });
    }

    function drawWisps(intensity) {
        if (intensity <= 0) return;

        ctx.globalAlpha = intensity;

        for (var i = 0; i < WISP_COUNT; i++) {
            var w = wisps[i];
            w.x += w.speedX;
            w.y += w.speedY;
            w.phase += 0.01;

            if (w.x < -200) w.x = W + 200;
            if (w.x > W + 200) w.x = -200;
            if (w.y < -200) w.y = H + 200;
            if (w.y > H + 200) w.y = -200;

            var pulsedAlpha = w.alpha * (0.6 + 0.4 * Math.sin(w.phase));
            var grad = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, w.size);
            grad.addColorStop(0, hsl(palette.h1 + w.hueOff, palette.sat - 20, palette.lit - 10, pulsedAlpha * intensity));
            grad.addColorStop(0.5, hsl(palette.h2 + w.hueOff, palette.sat - 30, palette.lit - 20, pulsedAlpha * 0.3 * intensity));
            grad.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.beginPath();
            ctx.fillStyle = grad;
            ctx.arc(w.x, w.y, w.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    }

    // ========================================================================
    // PHASE INTENSITY MAPPING — each phase activates different layers
    // ========================================================================
    function getLayerIntensity(layerName) {
        // Smooth fade in/out at phase boundaries
        var fadeIn = Math.min(phaseProgress * 5, 1);
        var fadeOut = Math.min((1 - phaseProgress) * 5, 1);
        var envelope = fadeIn * fadeOut;

        var phaseName = PHASE_NAMES[phase];

        // Layer activation map per phase
        var map = {
            genesis:     { attractor: 0.8, aura: 1.0, fractal: 0.5, portal: 0.3, wisps: 0.6, lens: 0.5 },
            expansion:   { attractor: 1.0, network: 0.8, fractal: 0.9, aura: 0.6, wisps: 0.7 },
            complexity:  { network: 1.0, lightning: 0.7, hypercube: 0.9, grid: 0.6, lens: 0.4 },
            instability: { lightning: 1.0, glitch: 0.8, attractor: 0.6, grid: 0.5, wisps: 0.4 },
            eruption:    { attractor: 1.0, lightning: 0.9, aura: 1.0, fractal: 0.7, wisps: 0.8 },
            portal:      { tunnel: 1.0, hypercube: 0.8, aura: 0.7, portal: 1.0, lens: 0.7, network: 0.5 },
            rebirth:     { tunnel: 0.6, attractor: 0.5, fractal: 0.8, aura: 0.9, lens: 0.6, wisps: 0.5 }
        };

        var phaseMap = map[phaseName] || {};
        return (phaseMap[layerName] || 0) * envelope;
    }

    // ========================================================================
    // PHASE TRANSITION FLASH
    // ========================================================================
    function drawFlash() {
        if (flashAlpha <= 0) return;

        flashAlpha -= deltaTime * 2;
        if (flashAlpha < 0) flashAlpha = 0;

        ctx.fillStyle = hsl(palette.h1, 50, 95, flashAlpha * 0.3);
        ctx.fillRect(0, 0, W, H);
    }

    // ========================================================================
    // PHASE INDICATOR — subtle HUD
    // ========================================================================
    function drawPhaseIndicator() {
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = hsl(palette.h1, palette.sat, palette.lit, 0.4);
        ctx.font = '10px monospace';
        ctx.fillText('PHASE ' + (phase + 1) + '/7: ' + PHASE_NAMES[phase].toUpperCase(), 15, H - 15);

        // Progress bar
        ctx.fillStyle = hsl(palette.h1, palette.sat, palette.lit, 0.1);
        ctx.fillRect(15, H - 10, 100, 2);
        ctx.fillStyle = hsl(palette.h1, palette.sat, palette.lit, 0.3);
        ctx.fillRect(15, H - 10, 100 * phaseProgress, 2);

        ctx.globalAlpha = 1;
    }

    // ========================================================================
    // MAIN ANIMATION LOOP
    // ========================================================================
    function animate() {
        var now = performance.now();
        deltaTime = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        time += deltaTime;

        // Update phase
        phaseTime += deltaTime;
        phaseProgress = phaseTime / PHASE_DURATIONS[phase];

        if (phaseProgress >= 1) {
            advancePhase();
        }

        // Clear canvas
        ctx.clearRect(0, 0, W, H);

        // Draw all layers with phase-modulated intensity
        drawGrid(getLayerIntensity('grid'));
        drawWisps(getLayerIntensity('wisps'));
        drawFractal(getLayerIntensity('fractal'));
        drawAttractor(getLayerIntensity('attractor'));
        drawNetwork(getLayerIntensity('network'));
        drawTunnel(getLayerIntensity('tunnel'));
        drawHypercube(getLayerIntensity('hypercube'));
        drawPortal(getLayerIntensity('portal'));
        drawGravitationalLens(getLayerIntensity('lens'));
        drawAura(getLayerIntensity('aura'));
        drawLightning(getLayerIntensity('lightning'));
        drawGlitch(getLayerIntensity('glitch'));

        // Phase transition flash
        drawFlash();

        // Phase indicator HUD
        drawPhaseIndicator();

        requestAnimationFrame(animate);
    }

    animate();
})();
