#### 如何安装后启动报错

![67683F87-F82F-4b31-8C55-63367E36FA9D.png](https://s2.loli.net/2022/06/21/r6A4Ut9hwSgna7y.png)

尝试加入如下配置（vue/webpack）
```` js
// vue.config.js
  transpileDependencies: [/aggregate-error/],
````

#### 如果跨域
华为云的sdk 比较。。，如果参数错误也会报跨域

其次还有一种可能，就是你的项目里也用了axios,正好你的axios 没有使用create， 正好你的全局拦截器可能增加了某些字段，headers 字段

详见[huaweicloud-sdk-browserjs-obs
 issue](https://github.com/huaweicloud/huaweicloud-sdk-browserjs-obs/issues/25),目前我已就此问题，已经给obs sdk提交修复pr,但是目前还没有合并。
 临时解决方案：将项目里的 axios 请求使用 create，重新创建实例。
