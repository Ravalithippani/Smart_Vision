  // --- 1. BACKGROUND ANIMATION (Floating Circles) ---
        const bgContainer = document.getElementById('floating-bg');
        const colors = ['#2979ff', '#00ff9d', '#8e2de2']; // Blue, Green, Purple

        for(let i=0; i<5; i++) {
            const circle = document.createElement('div');
            circle.classList.add('blob-circle');
            const size = 300 + Math.random() * 300; 
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            circle.style.width = `${size}px`;
            circle.style.height = `${size}px`;
            circle.style.background = color;
            circle.style.left = `${Math.random() * 100}%`;
            circle.style.top = `${Math.random() * 100}%`;
            
            bgContainer.appendChild(circle);

            gsap.to(circle, {
                x: `+=${(Math.random() - 0.5) * 200}`,
                y: `+=${(Math.random() - 0.5) * 200}`,
                duration: 10 + Math.random() * 20, 
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });
        }

        // --- 2. PARTICLES ---
        for(let i=0; i<25; i++) {
            const p = document.createElement('div');
            p.classList.add('particle');
            document.body.appendChild(p);
            
            gsap.set(p, { x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight });
            
            gsap.to(p, {
                y: `-=${30 + Math.random() * 50}`,
                x: `+=${(Math.random() - 0.5) * 30}`,
                opacity: 0,
                duration: 6 + Math.random() * 8,
                repeat: -1,
                delay: Math.random() * 5,
                ease: "none"
            });
        }

        // --- 3. MOUSE PARALLAX (Subtle Card Tilt) ---
        document.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 2; 
            const y = (e.clientY / window.innerHeight - 0.5) * 2;

            gsap.to('.blob-circle', {
                x: `+=${-x * 10}`,
                y: `+=${-y * 10}`,
                duration: 2,
                ease: 'power1.out',
                overwrite: 'auto'
            });

            gsap.to('.upload-card', {
                rotationY: x * 2,
                rotationX: -y * 2,
                duration: 0.5,
                ease: 'power1.out'
            });
        });

        // --- 4. FILE UPLOAD LOGIC ---
        let currentFile = null; // STORE FILE OBJECT

        const imageZone = document.getElementById('image-drop-zone');
        const imageInput = document.getElementById('image-input');
        const imagePreview = document.getElementById('image-preview');

        imageZone.addEventListener('click', () => imageInput.click());
        ['dragenter', 'dragover'].forEach(eventName => {
            imageZone.addEventListener(eventName, (e) => { e.preventDefault(); imageZone.classList.add('drag-over'); }, false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            imageZone.addEventListener(eventName, (e) => { e.preventDefault(); imageZone.classList.remove('drag-over'); }, false);
        });

        imageZone.addEventListener('drop', (e) => handleImageFiles(e.dataTransfer.files));
        imageInput.addEventListener('change', (e) => handleImageFiles(e.target.files));

        function handleImageFiles(files) {
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    currentFile = file; // STORE
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        imagePreview.src = e.target.result;
                        imagePreview.style.display = 'block';
                        imageZone.style.display = 'none';
                        gsap.from(imagePreview, { scale: 0.9, opacity: 0, duration: 0.4, ease: "back.out(1.2)" });
                    };
                    reader.readAsDataURL(file);
                }
            }
        }

        const audioZone = document.getElementById('audio-drop-zone');
        const audioInput = document.getElementById('audio-input');
        const audioVisual = document.getElementById('audio-visual');

        audioZone.addEventListener('click', () => audioInput.click());
        ['dragenter', 'dragover'].forEach(eventName => {
            audioZone.addEventListener(eventName, (e) => { e.preventDefault(); audioZone.classList.add('drag-over'); }, false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            audioZone.addEventListener(eventName, (e) => { e.preventDefault(); audioZone.classList.remove('drag-over'); }, false);
        });

        audioZone.addEventListener('drop', (e) => handleAudioFiles(e.dataTransfer.files));
        audioInput.addEventListener('change', (e) => handleAudioFiles(e.target.files));

        function handleAudioFiles(files) {
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('audio/')) {
                    currentFile = file; // STORE
                    audioVisual.style.display = 'flex';
                    audioZone.style.display = 'none';
                    gsap.from(audioVisual, { opacity: 0, y: 10, duration: 0.4 });
                }
            }
        }

        // --- 5. TAB SWITCHING ---
        function switchTab(tabName) {
            const buttons = document.querySelectorAll('.tab-btn');
            buttons.forEach(btn => btn.classList.remove('active'));
            
            const activeBtn = Array.from(buttons).find(b => b.getAttribute('onclick').includes(tabName));
            if(activeBtn) activeBtn.classList.add('active');

            const imageTab = document.getElementById('image-tab');
            const audioTab = document.getElementById('audio-tab');

            if (tabName === 'image') {
                gsap.to(audioTab, { autoAlpha: 0, duration: 0.3, onComplete: () => {
                    audioTab.classList.remove('active');
                    imageTab.classList.add('active');
                    gsap.fromTo(imageTab, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.4 });
                }});
            } else {
                gsap.to(imageTab, { autoAlpha: 0, duration: 0.3, onComplete: () => {
                    imageTab.classList.remove('active');
                    audioTab.classList.add('active');
                    gsap.fromTo(audioTab, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.4 });
                }});
            }
        }

        // --- 6. BACKEND INTEGRATION (FETCH) ---
        
        async function startAnalysis() {
            const btn = document.getElementById('analyze-btn');
            const btnText = document.getElementById('btn-text');
            const spinner = document.getElementById('btn-spinner');
            const icon = document.getElementById('btn-icon');

            if(!currentFile) {
                gsap.to(btn, { x: [-8, 8, -8, 8, 0], duration: 0.3 });
                return;
            }

            // UI Loading State
            btnText.style.display = 'none';
            icon.style.display = 'none';
            spinner.style.display = 'block';
            btn.style.cursor = 'wait';
            
            // Prepare Data
            const formData = new FormData();
            formData.append('file', currentFile);

            try {
                // Send to Flask Backend
                const response = await fetch('/predict', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) throw new Error('Server Error');

                const data = await response.json();
                showModal(data);

            } catch (error) {
                console.error('Error:', error);
                alert("Analysis failed. Please try again.");
            } finally {
                // Reset Button
                btnText.style.display = 'inline';
                icon.style.display = 'block';
                spinner.style.display = 'none';
                btn.style.cursor = 'pointer';
            }
        }

        // --- 7. RESULT MODAL LOGIC ---
        function showModal(data) {
            const modalOverlay = document.getElementById('result-modal');
            const modalTitle = document.getElementById('m-title');
            const modalScore = document.getElementById('m-score');
            const modalDesc = document.getElementById('m-desc');
            const modalProgress = document.getElementById('m-progress');
            const modalMetrics = document.getElementById('m-metrics');
            const iconCheck = document.getElementById('icon-check');
            const iconAlert = document.getElementById('icon-alert');
            const iconContainer = document.getElementById('m-icon');

            // Update Content
            modalTitle.innerText = data.verdict;
            modalDesc.innerText = data.summary;
            modalScore.innerText = data.confidence_score + '%';

            // Determine Color based on result
            const isFake = data.verdict.includes('FAKE') || data.verdict.includes('SPOOFED');
            
            if (isFake) {
                modalProgress.style.background = 'var(--danger-red)';
                iconContainer.style.background = '#ffeaea';
                iconContainer.style.color = 'var(--danger-red)';
                iconCheck.style.display = 'none';
                iconAlert.style.display = 'block';
            } else {
                modalProgress.style.background = 'var(--primary-green)';
                iconContainer.style.background = '#e6fffa';
                iconContainer.style.color = 'var(--primary-green)';
                iconCheck.style.display = 'block';
                iconAlert.style.display = 'none';
            }

            // Generate Metrics List
            let metricsHtml = '<ul>';
            for (const [key, value] of Object.entries(data.metrics)) {
                // Format key
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                metricsHtml += `
                    <li>
                        <span class="metrics-label">${label}</span>
                        <span class="metrics-val">${value}</span>
                    </li>
                `;
            }
            metricsHtml += '</ul>';
            modalMetrics.innerHTML = metricsHtml;

            // Animate In
            modalOverlay.style.display = 'flex';
            requestAnimationFrame(() => {
                modalOverlay.style.opacity = '1';
                document.querySelector('.modal-card').style.transform = 'scale(1)';
                
                // Animate Progress Bar after small delay
                setTimeout(() => {
                    modalProgress.style.width = data.confidence_score + '%';
                }, 100);
            });
        }

        function closeModal() {
            const modalOverlay = document.getElementById('result-modal');
            modalOverlay.style.opacity = '0';
            document.querySelector('.modal-card').style.transform = 'scale(0.9)';
            
            setTimeout(() => {
                modalOverlay.style.display = 'none';
                document.getElementById('m-progress').style.width = '0%';
                
                // Reset Upload UI
                imagePreview.style.display = 'none';
                imageZone.style.display = 'flex';
                audioVisual.style.display = 'none';
                audioZone.style.display = 'flex';
                currentFile = null; // Reset file
            }, 300);
        }