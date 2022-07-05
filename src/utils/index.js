


export const mToSize = (num) => {
  return num * 1024 * 1024
}


/**
 * 获取视频基础信息
 * duration 视频时长，单位秒
 * */
export const getVideoDuration = (url) => {
  return new Promise((resolve, reject) => {
    let video = document.createElement('video')
    video.preload = 'metadata'
    video.src = url
    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration
      })
      video = null
    }
    video.onerror = () => {
      reject(new Error('视频加载失败'))
      video = null
    }
  })
}


/**
 * 删除协议
 * */
export const removeProtocol = val => {
  if (!val) return ''
  const arr = val.split('//')
  return arr.pop()
}


/**
 * Promise.all 节流
 * @param {Array} tasks - 函数集合
 * @param {Object} options - 配置
 * @param {Number} options.concurrency - 并行数。默认无穷大
 * @param {Boolean} options.stopOnError - 遇到错误是否立即停止。默认true
 * */
export const pAllThrottle = (tasks = [], options = {}) => {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      concurrency: Number.POSITIVE_INFINITY,
      stopOnError: true
    }
    if (tasks.length === 0) {
      resolve()
      return
    }
    options = { ...defaultOptions, ...options }
    let concurrency = 0
    let finished = 0
    const count = tasks.length
    const cloneTasks = [...tasks]
    // let isResolve = false
    let isReject = false
    const run = (promiseFn) => {
      concurrency++
      promiseFn()
        .then(() => {
          concurrency--
          finished++
          if (finished === count) {
            // isResolve = true
            resolve()
          } else {
            if (!isReject) {
              drainQueue()
            }
          }
        }).catch(err => {
          concurrency--
          if (options.stopOnError && !isReject) {
            isReject = true
            reject(err)
          }
        })
    }
    const drainQueue = () => {
      while (cloneTasks.length > 0 && concurrency < options.concurrency) {
        const pFun = cloneTasks.shift()
        run(pFun)
      }
    }
    drainQueue()
  })
}
