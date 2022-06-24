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
