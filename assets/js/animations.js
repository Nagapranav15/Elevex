/* Custom Framer-style Animations & Redesigned Navbar Interaction script */

document.addEventListener("DOMContentLoaded", () => {
    // Check if theme toggle or theme state is needed for local navbar rendering
    initializeThemeToggle();

    // 1. Initialize text typewriter elements
    initTypewriterText();

    // 2. Initialize entry/reveal scroll animations
    initScrollAnimations();

    // 3. Initialize dynamic image reveals & 3D tilt effects
    initImageEffects();

    // 4. Initialize Unified Floating Navbar
    initUnifiedNavbar();
});

/* --- Theme Mode Initialization Helper --- */
function initializeThemeToggle() {
    const themeToggleBtn = document.getElementById("themeToggle");
    const themeToggleIcon = document.getElementById("themeToggleIcon");

    if (themeToggleBtn && themeToggleIcon) {
        // Toggle dark mode function
        themeToggleBtn.addEventListener("click", () => {
            if (document.documentElement.classList.contains("dark")) {
                document.documentElement.classList.remove("dark");
                document.documentElement.classList.add("light");
                localStorage.setItem("color-theme", "light");
                themeToggleIcon.textContent = "dark_mode";
            } else {
                document.documentElement.classList.remove("light");
                document.documentElement.classList.add("dark");
                localStorage.setItem("color-theme", "dark");
                themeToggleIcon.textContent = "light_mode";
            }
        });

        // Set initial icon state based on current root class
        if (document.documentElement.classList.contains("dark")) {
            themeToggleIcon.textContent = "light_mode";
        } else {
            themeToggleIcon.textContent = "dark_mode";
        }
    }
}

/* --- Typewriter Character Splitting & Animation --- */
function initTypewriterText() {
    const elements = document.querySelectorAll(".framer-typewriter");
    elements.forEach(el => {
        const text = el.textContent.trim();
        el.innerHTML = "";
        
        // Wrap each character in span for stagger
        const chars = text.split("");
        chars.forEach(char => {
            const span = document.createElement("span");
            span.className = "framer-char";
            span.textContent = char === " " ? "\u00A0" : char;
            el.appendChild(span);
        });

        if (typeof Motion !== "undefined") {
            const { inView, animate, stagger } = Motion;
            inView(el, () => {
                animate(el.querySelectorAll(".framer-char"), 
                    { opacity: [0, 1], y: [12, 0], scale: [0.95, 1] }, 
                    { delay: stagger(0.015), duration: 0.4, easing: "ease-out" }
                );
            });
        } else {
            // Fallback scroll reveal
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const spans = el.querySelectorAll(".framer-char");
                        spans.forEach((span, idx) => {
                            setTimeout(() => {
                                span.style.opacity = "1";
                                span.style.transform = "translateY(0) skewY(0)";
                            }, idx * 15);
                        });
                        observer.unobserve(el);
                    }
                });
            }, { threshold: 0.15 });
            observer.observe(el);
        }
    });
}

/* --- Scroll Reveal Animations (Text & Container blocks) --- */
function initScrollAnimations() {
    if (typeof Motion !== "undefined") {
        const { inView, animate, stagger } = Motion;
        
        // Slide Down Reveal (From up to default)
        inView(".framer-slide-down", ({ target }) => {
            animate(target, { opacity: [0, 1], y: [-30, 0] }, { duration: 0.8, easing: [0.16, 1, 0.3, 1] });
        });

        // Slide Up Reveal (From down to default)
        inView(".framer-slide-up", ({ target }) => {
            animate(target, { opacity: [0, 1], y: [35, 0] }, { duration: 0.8, easing: [0.16, 1, 0.3, 1] });
        });

        // Stagger Children Reveal
        inView(".framer-stagger-parent", ({ target }) => {
            const items = target.querySelectorAll(".framer-stagger-item");
            if (items.length) {
                animate(items, { opacity: [0, 1], y: [20, 0] }, { delay: stagger(0.08), duration: 0.6, easing: [0.16, 1, 0.3, 1] });
            }
        });
    } else {
        // Observer Fallback
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    
                    if (entry.target.classList.contains("framer-stagger-parent")) {
                        const items = entry.target.querySelectorAll(".framer-stagger-item");
                        items.forEach((item, idx) => {
                            setTimeout(() => {
                                item.classList.add("visible");
                            }, idx * 80);
                        });
                    }
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll(".framer-slide-down, .framer-slide-up, .framer-stagger-parent").forEach(el => {
            revealObserver.observe(el);
        });
    }
}

/* --- Image Reveals & 3D Hover Tilt / Spotlight --- */
function initImageEffects() {
    // 1. Handle Scroll Reveals
    if (typeof Motion !== "undefined") {
        const { inView } = Motion;
        
        inView(".framer-img-reveal", ({ target }) => {
            target.classList.add("visible");
        });

        inView(".framer-img-wipe-reveal", ({ target }) => {
            target.classList.add("animating");
            setTimeout(() => {
                target.classList.add("visible");
                target.classList.remove("animating");
            }, 600);
        });
    } else {
        const imgObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (entry.target.classList.contains("framer-img-wipe-reveal")) {
                        entry.target.classList.add("animating");
                        setTimeout(() => {
                            entry.target.classList.add("visible");
                            entry.target.classList.remove("animating");
                        }, 600);
                    } else {
                        entry.target.classList.add("visible");
                    }
                    imgObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        document.querySelectorAll(".framer-img-reveal, .framer-img-wipe-reveal").forEach(el => {
            imgObserver.observe(el);
        });
    }

    // 2. Mouse Move Tilt and Spotlight Tracker
    const cards = document.querySelectorAll(".framer-img-tilt, .framer-spotlight");
    cards.forEach(card => {
        card.addEventListener("mousemove", (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Set coordinates for CSS radial-gradient spotlights
            card.style.setProperty("--mouse-x", `${x}px`);
            card.style.setProperty("--mouse-y", `${y}px`);

            // If 3D Tilt is enabled
            if (card.classList.contains("framer-img-tilt")) {
                const xVal = x - rect.width / 2;
                const yVal = y - rect.height / 2;
                const tiltX = -(yVal / rect.height) * 12; // Max 12deg tilt
                const tiltY = (xVal / rect.width) * 12;

                card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02, 1.02, 1.02)`;
                
                // Slightly translate inside image to create double parallax depth
                const img = card.querySelector("img");
                if (img) {
                     img.style.transform = `translateZ(18px) scale(1.04)`;
                }
            }
        });

        card.addEventListener("mouseleave", () => {
            if (card.classList.contains("framer-img-tilt")) {
                card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
                const img = card.querySelector("img");
                if (img) {
                    img.style.transform = "translateZ(0px) scale(1)";
                }
            }
        });
    });
}

/* --- Unified Floating Navbar Logic --- */
function initUnifiedNavbar() {
    const navbar = document.getElementById("navbar-unified");
    const navLinksContainer = document.getElementById("nav-links-container");
    const indicator = document.getElementById("nav-indicator");
    const links = document.querySelectorAll(".nav-link-item");
    const mobileMenu = document.getElementById("mobileMenu");
    const menuToggle = document.getElementById("menuToggle");

    if (!navbar) return;

    // 1. Shrink on Scroll Logic
    window.addEventListener("scroll", () => {
        if (window.scrollY > 50) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }
    });

    // 2. Dynamic Sliding Magnetic Indicator Link Hover
    if (navLinksContainer && indicator && links.length) {
        // Find current active link
        const activeLink = document.querySelector(".nav-link-item.active");

        // Position indicator at specific link bounds
        const positionIndicator = (el) => {
            if (!el) {
                indicator.style.opacity = "0";
                return;
            }
            const containerRect = navLinksContainer.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            
            indicator.style.opacity = "1";
            indicator.style.width = `${elRect.width}px`;
            indicator.style.height = `${elRect.height}px`;
            indicator.style.left = `${elRect.left - containerRect.left}px`;
            indicator.style.top = `${elRect.top - containerRect.top}px`;
        };

        // Initialize indicator position
        setTimeout(() => positionIndicator(activeLink), 150);

        // Hover events
        links.forEach(link => {
            link.addEventListener("mouseenter", () => {
                positionIndicator(link);
            });
        });

        // Reset indicator to active link when leaving nav
        navLinksContainer.addEventListener("mouseleave", () => {
            const currentActive = document.querySelector(".nav-link-item.active");
            positionIndicator(currentActive);
        });

        // Handle window resizing to keep bounds correct
        window.addEventListener("resize", () => {
            const currentActive = document.querySelector(".nav-link-item.active");
            positionIndicator(currentActive);
        });
    }

    // 3. Responsive Mobile Menu Drawer Toggle
    if (menuToggle && mobileMenu) {
        const toggleLines = menuToggle.querySelectorAll("span");
        
        menuToggle.addEventListener("click", () => {
            mobileMenu.classList.toggle("open");
            
            // Hamburger animation
            if (mobileMenu.classList.contains("open")) {
                toggleLines[0].style.transform = "rotate(45deg) translate(5px, 5px)";
                toggleLines[1].style.opacity = "0";
                toggleLines[2].style.transform = "rotate(-45deg) translate(5px, -6px)";
            } else {
                toggleLines[0].style.transform = "none";
                toggleLines[1].style.opacity = "1";
                toggleLines[2].style.transform = "none";
            }
        });

        // Close menu if a link is clicked
        const mobileLinks = mobileMenu.querySelectorAll("a");
        mobileLinks.forEach(link => {
            link.addEventListener("click", () => {
                mobileMenu.classList.remove("open");
                toggleLines[0].style.transform = "none";
                toggleLines[1].style.opacity = "1";
                toggleLines[2].style.transform = "none";
            });
        });
    }
}
