declare module "*.vue" {
  import type { DefineComponent } from "vue";
  // biome-ignore lint/suspicious/noExplicitAny: Vue SFC ambient shim — generics must be `any` so consumers can import SFCs with any props/emits/slots shape.
  const component: DefineComponent<any, any, any>; // biome-ignore lint/suspicious/noExplicitAny: see above
  export default component;
}
