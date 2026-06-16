<template>
  <div id="particles-js" class="particles-container"></div>
</template>

<script setup>
import { nextTick, onMounted, onBeforeUnmount } from 'vue'
import 'particles.js'

const props = defineProps({
  excludeRoutes: {
    type: Array,
    default: () => ['login']
  }
})

const particlesId = 'particles-js'

const currentRoute = () => {
  return window.location.pathname.replace('/', '') || 'inbox'
}

const shouldShow = () => {
  const route = currentRoute()
  return !props.excludeRoutes.includes(route)
}

const initParticles = async () => {
  if (!shouldShow()) return
  await nextTick()

  if (!window.particlesJS) {
    console.warn('particles.js is not available')
    return
  }

  destroyParticles()

  window.particlesJS(particlesId, {
    particles: {
      number: {
        value: 80,
        density: {
          enable: true,
          value_area: 800
        }
      },
      color: {
        value: '#1890ff'
      },
      shape: {
        type: 'circle',
        stroke: {
          width: 0,
          color: '#1890ff'
        }
      },
      opacity: {
        value: 0.4,
        random: true,
        anim: {
          enable: true,
          speed: 1,
          opacity_min: 0.1,
          sync: false
        }
      },
      size: {
        value: 4,
        random: true,
        anim: {
          enable: true,
          speed: 2,
          size_min: 0.5,
          sync: false
        }
      },
      line_linked: {
        enable: true,
        distance: 150,
        color: '#1890ff',
        opacity: 0.3,
        width: 1
      },
      move: {
        enable: true,
        speed: 1.5,
        direction: 'none',
        random: true,
        straight: false,
        out_mode: 'out',
        attract: {
          enable: true,
          rotateX: 600,
          rotateY: 1200
        }
      }
    },
    interactivity: {
      detect_on: 'window',
      events: {
        onhover: {
          enable: true,
          mode: 'grab'
        },
        onclick: {
          enable: true,
          mode: 'push'
        },
        resize: true
      },
      modes: {
        grab: {
          distance: 140,
          line_linked: {
            opacity: 0.5
          }
        },
        bubble: {
          distance: 400,
          size: 10,
          duration: 2,
          opacity: 0.5,
          speed: 3
        },
        repulse: {
          distance: 200,
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
  })
}

const destroyParticles = () => {
  const container = document.getElementById(particlesId)
  if (container) {
    container.innerHTML = ''
  }
  if (window.pJSDom && window.pJSDom.length > 0) {
    window.pJSDom.forEach(item => {
      item?.pJS?.fn?.vendors?.destroypJS?.()
    })
    window.pJSDom = []
  }
}

onMounted(() => {
  initParticles()
})

onBeforeUnmount(() => {
  destroyParticles()
})
</script>

<style scoped>
.particles-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 2;
  pointer-events: none;
  background: transparent;
  opacity: 0.35;
}

:deep(#particles-js canvas) {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  z-index: 2 !important;
  pointer-events: none !important;
}
</style>
