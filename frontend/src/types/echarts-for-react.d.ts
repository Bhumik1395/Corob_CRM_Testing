declare module "echarts-for-react" {
  import { Component, CSSProperties } from "react";

  export interface EChartsReactProps {
    option: any;
    style?: CSSProperties;
    className?: string;
    [key: string]: any;
  }

  export default class ReactECharts extends Component<EChartsReactProps> {
    getEchartsInstance(): any;
    resize(): void;
  }
}
