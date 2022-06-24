(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.vueBrowserUtils = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const { useLoadAsyncComponents, loadAsyncComponent } = require("./useLoadAsyncComponents");

function requireModuleList(modules) {
  return new Promise((res) => {
    window.require(modules, function (...args) {
      res(args);
    });
  });
}
function requireModule(module) {
  return new Promise((res) => {
    window.require([module], function (module) {
      res(module);
    });
  });
}

function getTemplateString(selector) {
  return document.querySelector(selector).innerHTML;
}

function fetchTemplateString(url) {
  return fetch(url).then(function (response) {
    return response.text().then((text) => {
      let div = document.createElement("div");
      div.innerHTML = text;
      let template = div.querySelector("template").innerHTML;
      div.remove();
      div = null;
      return template;
    });
  });
}

function extendTemplate(Vue, template, option = {}) {
  const res = Vue.compile(template);
  return Vue.extend({
    // template: template,
    render: res.render,
    staticRenderFns: res.staticRenderFns,
    ...option,
  });
}

function renderTemplate(Vue, template, data) {
  var V = extendTemplate(Vue, template);

  let dom = document.createElement("div");

  return new Promise((res) => {
    new V({
      data,
      mounted() {
        res(this.$el.outerHTML);
        this.$destroy();
      },
      beforeDestroy() {
        dom.remove();
        dom = null;
      },
    }).$mount(dom);
  });
}

function compile(Vue, template) {
  return Vue.compile(template);
}

function defineComponent(Vue, template, option = {}) {
  return {
    ...Vue.compile(template),
    ...option,
  };
}

function defineAsyncTemplateComponent(Vue, url, option = {}) {
  return fetchTemplateString(url).then((template) => {
    return defineComponent(Vue, template, option);
  });
}

module.exports = {
  loadAsyncComponent,
  getTemplateString,
  fetchTemplateString,
  extendTemplate,
  renderTemplate,
  defineAsyncTemplateComponent,
  compile,
  defineComponent,
  requireModuleList,
  requireModule,
};

},{"./useLoadAsyncComponents":2}],2:[function(require,module,exports){
const useDeFineComponent = (Vue, template, resolve) => (call) => {
  let component = call(Vue, template);
  resolve(component);
  return component;
};

function loadAsyncComponent(url, name) {
  return () => {
    let comResolve;
    let com = new Promise((res) => (comResolve = res));

    // 加载组件
    fetch(url)
      .then((res) => res.text())
      .then((html) => {
        let div = document.createElement("div");
        div.innerHTML = html;
        const template = div.querySelector("template").innerHTML;

        // https://stackoverflow.com/questions/11513392/how-to-detect-when-innerhtml-is-complete
        // https://stackoverflow.com/questions/1197575/can-scripts-be-inserted-with-innerhtml
        const script = div.querySelector("script");
        const style = div.querySelector("style");
        const defineComponent = useDeFineComponent(Vue, template, (component) =>
          comResolve(component)
        );
        const script_text = script.innerHTML.trim();
        const script_text_eval = `${script_text}`;
        eval(script_text_eval);

        // 加载样式
        if (style) {
          // TODO: 可以使用文件hash值,作为 id
          style.id = "style_" + name;
          if (document.getElementById("style_" + name)) {
            document.getElementById("style_" + name).innerHTML = style.innerHTML;
          } else {
            document.head.appendChild(style);
          }
        }

        div.remove();
        div = null;
      });

    return com;
  };
}

module.exports = { loadAsyncComponent };

/* 

// 编写组件 AComponent.html

<template>
  <div @click="test">{{title}}</div>
</template>
<script>
  defineComponent((Vue, template) => {
    return {
      name: "AComponent",
      ...Vue.compile(template),
      props: {
        title: {
          type: String,
          default: "我是A组件1",
        },
      },
      created() {
        console.log("我是A组件的created1");
      },
      methods: {
        test() {
          hello2();
        },
      },
    };
  });

  function hello2() {
    console.log("fff");
  }
</script>

// 使用组件 page



new Vue({
  components: {
    
  },
  render(h) {
    return h("div", [
      [
        h("a-component", {}),
      ],
    ]);
  },
})

*/

},{}]},{},[1])(1)
});
