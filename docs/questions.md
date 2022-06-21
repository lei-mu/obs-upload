#### 安装后启动报错

![67683F87-F82F-4b31-8C55-63367E36FA9D.png](https://s2.loli.net/2022/06/21/r6A4Ut9hwSgna7y.png)

尝试加入如下配置（vue/webpack）
```` js
// vue.config.js
  transpileDependencies: [/aggregate-error/],
````