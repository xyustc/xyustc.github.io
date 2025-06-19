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

// 页面加载动画
document.addEventListener('DOMContentLoaded', () => {
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
    
    // 启动交互效果
    setTimeout(() => {
        mouseParticles = new MouseFollowParticles();
        initParticleInteraction();
    }, 1000);
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
    }

    addParticle() {
        if (this.particles.length < 15) { // 减少粒子数量让尾迹更细腻
            this.particles.push({
                x: this.mouse.x,
                y: this.mouse.y,
                vx: (Math.random() - 0.5) * 1, // 减少随机速度
                vy: (Math.random() - 0.5) * 1,
                life: 1,
                decay: 0.03, // 稍快的衰减
                size: Math.random() * 1.5 + 0.5, // 更小的粒子
                color: `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.3})` // 白色半透明
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
    }

    drawParticles() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.life * 0.8; // 更低的透明度
            this.ctx.fillStyle = particle.color;
            this.ctx.shadowBlur = 3; // 减少发光效果
            this.ctx.shadowColor = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
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

// 鼠标磁场效果 - 影响背景粒子
let mousePosition = { x: 0, y: 0 };
let isMouseMoving = false;
let mouseTimer;

document.addEventListener('mousemove', (e) => {
    // 使用页面绝对坐标，不需要转换
    mousePosition.x = e.clientX;
    mousePosition.y = e.clientY;
    isMouseMoving = true;
    
    // 清除之前的定时器
    clearTimeout(mouseTimer);
    
    // 设置鼠标停止移动的检测
    mouseTimer = setTimeout(() => {
        isMouseMoving = false;
    }, 100);
    
    // 不再创建涟漪效果，只依赖鼠标跟随粒子
});

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


