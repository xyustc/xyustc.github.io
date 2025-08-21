// 页面切换动画功能
class PageTransition {
    constructor() {
        this.isTransitioning = false;
        this.init();
    }

    init() {
        // 创建过渡遮罩层
        this.createTransitionOverlay();
        
        // 绑定导航链接点击事件
        this.bindNavigationEvents();
        
        // 页面加载完成后添加内容动画
        this.initPageAnimation();
    }    createTransitionOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'page-transition';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-text">页面切换中</div>
                <div class="loading-dots">
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                    <div class="loading-dot"></div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        this.overlay = overlay;
    }

    bindNavigationEvents() {
        // 获取所有需要过渡的链接
        const navLinks = document.querySelectorAll('.nav-links a[href*=".html"], a[href*=".html"]:not([target="_blank"])');
          navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                
                // 跳过当前页面链接和外部链接
                if (href === window.location.pathname.split('/').pop() || 
                    href.startsWith('http') || 
                    link.hasAttribute('target')) {
                    return;
                }
                
                // 跳过锚点链接
                if (href.startsWith('#')) {
                    return;
                }
                
                e.preventDefault();
                
                // 添加点击反馈
                link.classList.add('transitioning');
                
                this.navigateWithTransition(href);
            });
        });
    }

    navigateWithTransition(url) {
        if (this.isTransitioning) return;
        
        this.isTransitioning = true;
        
        // 显示过渡动画
        this.overlay.classList.add('active');
        
        // 延迟跳转，让动画播放
        setTimeout(() => {
            window.location.href = url;
        }, 250);
    }    initPageAnimation() {
        // 页面加载完成后移除过渡遮罩（如果存在）
        window.addEventListener('load', () => {
            const existingOverlay = document.querySelector('.page-transition.active');
            if (existingOverlay) {
                setTimeout(() => {
                    existingOverlay.classList.remove('active');
                }, 100);
            }
        });
    }
}

// 初始化页面切换功能
const pageTransition = new PageTransition();

// 粒子背景配置
particlesJS('particles-js', {
    particles: {
        number: { value: 120, density: { enable: true, value_area: 800 } },
        color: { value: "#ffffff" },
        shape: { 
            type: "circle",
            stroke: { width: 0, color: "#000000" },
            polygon: { nb_sides: 5 }
        },
        opacity: { 
            value: 0.5, 
            random: true,
            anim: { enable: false, speed: 1, opacity_min: 0.1, sync: false }
        },
        size: { 
            value: 3, 
            random: true,
            anim: { enable: false, speed: 40, size_min: 0.1, sync: false }
        },
        line_linked: {
            enable: true,
            distance: 150,
            color: "#ffffff",
            opacity: 0.4,
            width: 1
        },
        move: {
            enable: true,
            speed: 2,
            direction: "none",
            random: false,
            straight: false,
            out_mode: "out",
            bounce: false,
            attract: { enable: false, rotateX: 600, rotateY: 1200 }
        }
    },
    interactivity: {
        detect_on: "canvas",
        events: {
            onhover: { 
                enable: true, 
                mode: "grab" 
            },
            onclick: { 
                enable: true, 
                mode: "push" 
            },
            resize: true
        },
        modes: {
            grab: {
                distance: 300,
                line_linked: { 
                    opacity: 0.8,
                    color: "#6C63FF"
                }
            },
            bubble: {
                distance: 250,
                size: 6,
                duration: 2,
                opacity: 0.8,
                speed: 3
            },
            repulse: {
                distance: 100,
                duration: 0.4
            },
            push: {
                particles_nb: 4
            },
            remove: {
                particles_nb: 2
            }
        }
    },
    retina_detect: true
});

// 平滑滚动
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// 导航栏滚动效果
window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    if (window.scrollY > 100) {
        nav.style.background = 'rgba(255, 255, 255, 0.05)';
        nav.style.backdropFilter = 'blur(40px) saturate(130%)';
        nav.style.webkitBackdropFilter = 'blur(40px) saturate(130%)';
        nav.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)';
        nav.style.borderBottom = '1px solid rgba(255, 255, 255, 0.12)';
    } else {
        nav.style.background = 'rgba(255, 255, 255, 0.03)';
        nav.style.backdropFilter = 'blur(35px) saturate(120%)';
        nav.style.webkitBackdropFilter = 'blur(35px) saturate(120%)';
        nav.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
        nav.style.borderBottom = '1px solid rgba(255, 255, 255, 0.08)';
    }
});

// 鼠标跟随粒子效果
class MouseFollowParticles {
    constructor() {
        this.particles = [];
        this.mouse = { x: 0, y: 0 };
        this.canvas = null;
        this.ctx = null;
        this.animationId = null;
        this.init();
    }

    init() {
        // 创建画布用于鼠标跟随粒子
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '10';
        document.body.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        
        // 监听鼠标移动
        document.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this.addParticle();
        });
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => this.resize());
        
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }    addParticle() {
        if (this.particles.length < 10) { // 进一步减少粒子数量
            this.particles.push({
                x: this.mouse.x,
                y: this.mouse.y,
                vx: (Math.random() - 0.5) * 0.8,
                vy: (Math.random() - 0.5) * 0.8,
                life: 1,
                decay: 0.04,
                size: Math.random() * 1.2 + 0.4,
                color: `rgba(255, 255, 255, ${Math.random() * 0.4 + 0.2})`
            });
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= particle.decay;
            particle.size *= 0.97; // 更慢的尺寸衰减，保持更长时间
            particle.vx *= 0.98; // 添加阻力效果
            particle.vy *= 0.98;
            
            if (particle.life <= 0 || particle.size < 0.1) {
                this.particles.splice(i, 1);
            }
        }
    }    drawParticles() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach(particle => {
            this.ctx.globalAlpha = particle.life * 0.6;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        this.ctx.globalAlpha = 1; // 重置透明度
    }

    animate() {
        this.updateParticles();
        this.drawParticles();
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}

// 初始化鼠标跟随粒子效果
let mouseParticles;

// 简化的粒子交互系统
function initParticleInteraction() {
    // 等待粒子系统完全初始化
    const waitForParticles = setInterval(() => {
        const canvas = document.querySelector('#particles-js canvas');
        if (canvas && window.pJSDom && window.pJSDom[0] && window.pJSDom[0].pJS) {
            clearInterval(waitForParticles);
            
            const pJS = window.pJSDom[0].pJS;
            
            // 实时更新鼠标位置
            document.addEventListener('mousemove', (e) => {
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                
                // 计算相对于画布的坐标并考虑DPI缩放
                pJS.interactivity.mouse.pos_x = (e.clientX - rect.left) * scaleX;
                pJS.interactivity.mouse.pos_y = (e.clientY - rect.top) * scaleY;
                pJS.interactivity.status = 'mousemove';
            });
            
            // 鼠标离开时重置
            document.addEventListener('mouseleave', () => {
                pJS.interactivity.status = 'mouseleave';
                pJS.interactivity.mouse.pos_x = null;
                pJS.interactivity.mouse.pos_y = null;
            });
            
            // 页面失去焦点时重置
            window.addEventListener('blur', () => {
                pJS.interactivity.status = 'mouseleave';
            });
            
            console.log('粒子交互系统已启动');
        }
    }, 100);
}

// 页面加载时滚动到顶部功能
function ensureScrollToTop() {
    // 立即滚动到顶部，防止浏览器恢复滚动位置
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    
    // 强制滚动到顶部
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // 确保在页面完全加载后再次滚动到顶部
    window.addEventListener('load', () => {
        setTimeout(() => {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        }, 50);
    });
    
    // 监听页面显示事件（包括前进/后退按钮）
    window.addEventListener('pageshow', (event) => {
        // 如果是从缓存中恢复的页面，也要滚动到顶部
        if (event.persisted) {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        }
    });
}

// 页面内容动画
function initContentAnimations() {
    // 为其他页面元素添加入场动画（排除hero-content，它在DOMContentLoaded中单独处理）
    const animatedElements = document.querySelectorAll('.skills-grid, .contact-section, section:not(.hero)');
    animatedElements.forEach((element, index) => {
        if (element && element.style.opacity !== '1') {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * 100 + 300);
        }
    });
}

// 邮箱联系功能
function initEmailContact() {
    const emailBtn = document.getElementById('emailBtn');
    if (emailBtn) {
        emailBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showEmailModal();
        });
    }
}

// 显示邮箱联系模态框
function showEmailModal() {
    const email = 'xingyujafk@gmail.com';
    const subject = '学术交流或技术合作';
    
    const options = [
        { 
            text: '📧 打开默认邮箱应用', 
            action: () => window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}`)
        },
        { 
            text: '📋 复制邮箱地址', 
            action: () => {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(email).then(() => {
                        showNotification('✅ 邮箱地址已复制到剪贴板！');
                    }).catch(() => {
                        showNotification('❌ 复制失败，请手动复制邮箱地址');
                    });
                } else {
                    showNotification('❌ 浏览器不支持剪贴板功能');
                }
            }
        },
        { 
            text: '🌐 打开 Gmail 网页版', 
            action: () => window.open(`https://mail.google.com/mail/?view=cm&to=${email}&su=${encodeURIComponent(subject)}`, '_blank')
        }
    ];
    
    showEmailOptions(options);
}

// 显示邮箱选项弹窗
function showEmailOptions(options) {
    // 移除现有弹窗
    const existing = document.querySelector('.email-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.className = 'email-modal';
    modal.innerHTML = `
        <div class="email-modal-content">
            <h3>选择联系方式</h3>
            <div class="email-options">
                ${options.map((option, index) => 
                    `<button class="email-option-btn" data-index="${index}">${option.text}</button>`
                ).join('')}
            </div>
            <button class="email-modal-close">取消</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    // 不再锁定 body 滚动，避免用户看不到弹窗时无法滚动
    // document.body.classList.add('modal-open');
    
    // 绑定事件
    modal.querySelectorAll('.email-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            options[index].action();
            modal.remove();
        });
    });
    
    modal.querySelector('.email-modal-close').addEventListener('click', () => { modal.remove(); });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) { modal.remove(); }
    });
    // ESC 关闭
    const escListener = (e) => { if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', escListener); } };
    document.addEventListener('keydown', escListener);
    // 由于使用 overlay flex 居中，不再需要 JS 动态定位
    
    // 显示动画
    setTimeout(() => modal.classList.add('show'), 10);
}

// 显示通知消息
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// 初始化所有功能
document.addEventListener('DOMContentLoaded', () => {
    // 确保页面从顶部开始
    ensureScrollToTop();
    
    // 初始化内容动画
    initContentAnimations();
    
    // 初始化邮箱联系功能
    initEmailContact();
    
    // 初始化首页内容动画
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        heroContent.style.opacity = '0';
        heroContent.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            heroContent.style.transition = 'opacity 1s ease, transform 1s ease';
            heroContent.style.opacity = '1';
            heroContent.style.transform = 'translateY(0)';
        }, 500);
    }
    
    // 延迟启动交互效果
    setTimeout(() => {
        mouseParticles = new MouseFollowParticles();
        initParticleInteraction();
    }, 1000);
});

// 页面加载前就执行滚动到顶部
ensureScrollToTop();


