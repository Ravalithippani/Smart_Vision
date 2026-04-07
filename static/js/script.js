gsap.registerPlugin(ScrollTrigger);

        /* 
           ========================================
           LOGIC 1: GLOWING CLUSTER ANIMATION
           ========================================
        */
        const glowCluster = document.getElementById('glow-cluster');
        const blobs = document.querySelectorAll('.glow-blob');

        // Helper: Get bottom-center coordinates of an image
        const getAnchorPos = (elem) => {
            if(!elem) return {x:0, y:0};
            const rect = elem.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.bottom + 40
            };
        };

        // Function to scatter blobs randomly around the center
        const scrambleOffsets = () => {
            blobs.forEach((blob) => {
                // Random X between -120 and 120
                const offsetX = (Math.random() - 0.5) * 240;
                // Random Y between -60 and 60
                const offsetY = (Math.random() - 0.5) * 120;

                gsap.to(blob, {
                    x: offsetX,
                    y: offsetY,
                    duration: 2 + Math.random(),
                    ease: "power2.inOut"
                });
            });
        };

        // Continuous floating animation for blobs (Idle state)
        const floatBlobs = () => {
            blobs.forEach((blob) => {
                gsap.to(blob, {
                    x: `+=${(Math.random() - 0.5) * 40}`,
                    y: `+=${(Math.random() - 0.5) * 40}`,
                    scale: 0.8 + Math.random() * 0.4,
                    duration: 3 + Math.random() * 2,
                    repeat: -1,
                    yoyo: true,
                    ease: "sine.inOut"
                });
            });
        };

        // Main Move Function
        const moveCluster = (targetElem) => {
            if(!targetElem) return;
            const newPos = getAnchorPos(targetElem);
            
            // 1. Move the container to the new image
            gsap.to(glowCluster, {
                x: newPos.x,
                y: newPos.y,
                duration: 1.5,
                ease: "power2.inOut",
                onComplete: () => {
                    // 2. Once arrived, scramble the blob positions relative to new center
                    scrambleOffsets();
                }
            });
        };

        // Initialize
        const targetHero = document.getElementById('hero-target');
        const targetDemo = document.getElementById('demo-target');
        const targetHow = document.getElementById('how-target');

        window.addEventListener('load', () => {
            const initPos = getAnchorPos(targetHero);
            gsap.set(glowCluster, { x: initPos.x, y: initPos.y });
            
            // Start floating
            floatBlobs();
            // Initial scramble
            scrambleOffsets();
        });

        // Scroll Triggers
        ScrollTrigger.create({
            trigger: "#hero",
            start: "top center",
            end: "bottom top",
            onLeave: () => moveCluster(targetDemo),
            onEnterBack: () => moveCluster(targetHero)
        });

        ScrollTrigger.create({
            trigger: "#demo",
            start: "top center",
            end: "bottom top",
            onLeave: () => moveCluster(targetHow),
            onEnterBack: () => moveCluster(targetDemo)
        });


        /* 
           ========================================
           LOGIC 2: DYNAMIC 3D TILT (Mouse Bending)
           ========================================
        */
        const tiltElements = document.querySelectorAll('.data-tilt-element');

        tiltElements.forEach(el => {
            let target = el.querySelector('img');
            if (el.classList.contains('scan-viewport')) {
                target = el; 
            }

            if(!target) return;

            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = ((y - centerY) / centerY) * -12; 
                const rotateY = ((x - centerX) / centerX) * 12;

                gsap.to(target, {
                    rotateX: rotateX,
                    rotateY: rotateY,
                    scale: 1.05,
                    duration: 0.4,
                    ease: "power2.out",
                    transformPerspective: 1000,
                    transformOrigin: "center center"
                });
            });

            el.addEventListener('mouseleave', () => {
                gsap.to(target, {
                    rotateX: 0,
                    rotateY: 0,
                    scale: 1,
                    duration: 0.8,
                    ease: "elastic.out(1, 0.5)"
                });
            });
        });

        /* 
           ========================================
           LOGIC 3: BACKGROUND INFINITE MARQUEE
           ========================================
        */
        const animateMarquee = (id, dir, speed) => {
            const row = document.getElementById(id);
            if(!row) return;
            row.innerHTML += row.innerHTML; 
            const toVal = dir === 'left' ? -50 : 0;
            if(dir === 'right') gsap.set(row, { xPercent: -50 });

            gsap.to(row, {
                xPercent: toVal,
                ease: "none",
                duration: speed,
                repeat: -1
            });
        };

        animateMarquee('row-1', 'left', 40);
        animateMarquee('row-2', 'right', 55);
        animateMarquee('row-3', 'left', 35);
        animateMarquee('row-4', 'right', 45);

        /* 
           ========================================
           LOGIC 4: SCANNER SIMULATION
           ========================================
        */
        
        const scanTl = gsap.timeline({ repeat: -1, yoyo: true });
        scanTl.to("#scan-line", { 
            top: "100%", 
            duration: 2, 
            ease: "power1.inOut" 
        });

        const demoViewport = document.querySelector('.scan-viewport');
        const scanImg = document.querySelector('.scan-image');
        
        demoViewport.addEventListener('mouseenter', () => {
            gsap.to(scanImg, { scale: 1.1, opacity: 0.9, duration: 0.5 });
        });
        demoViewport.addEventListener('mouseleave', () => {
            gsap.to(scanImg, { scale: 1, opacity: 0.7, duration: 0.5 });
        });

        // Data Simulation Loop
        const statusEl = document.getElementById('status-text');
        const confEl = document.getElementById('confidence-val');
        const statusPhrases = [
            "ANALYZING PIXEL NOISE...",
            "CHECKING BIOMETRIC PULSE...",
            "DETECTING TEMPORAL ARTIFACTS...",
            "MATCHING GAN FINGERPRINTS...",
            "VERIFYING AUDIO WAVEFORM...",
            "CALCULATING RISK SCORE..."
        ];

        setInterval(() => {
            let val = (Math.random() * (99.9 - 85.0) + 85.0).toFixed(1);
            confEl.innerText = val;

            if(Math.random() > 0.6) {
                const randomPhrase = statusPhrases[Math.floor(Math.random() * statusPhrases.length)];
                statusEl.innerText = randomPhrase;
                
                gsap.fromTo(statusEl, 
                    { x: -2, opacity: 0.5 }, 
                    { x: 0, opacity: 1, duration: 0.1, clearProps: "all" }
                );
            }
        }, 1200);

        /* 
           ========================================
           LOGIC 5: SCROLL REVEAL ANIMATIONS
           ========================================
        */
        
        gsap.from(".step-card", {
            y: 50,
            opacity: 0,
            duration: 0.8,
            stagger: 0.2,
            ease: "power3.out",
            scrollTrigger: {
                trigger: "#how",
                start: "top 70%"
            }
        });

        // Handle Window Resize (Update Cluster Position)
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                ScrollTrigger.refresh();
                
                // Force cluster update
                const scrollY = window.scrollY;
                const height = window.innerHeight;
                if(scrollY < height) moveCluster(targetHero);
                else if (scrollY < height * 2) moveCluster(targetDemo);
                else moveCluster(targetHow);
            }, 200);
        });