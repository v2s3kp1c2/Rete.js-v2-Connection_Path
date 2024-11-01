import { createRoot } from "react-dom/client";
import { NodeEditor, GetSchemes, ClassicPreset } from "rete";
import { AreaPlugin, Area2D, AreaExtensions } from "rete-area-plugin";
import {
  ConnectionPlugin,
  Presets as ConnectionPresets
} from "rete-connection-plugin";
import { ReactPlugin, Presets, ReactArea2D } from "rete-react-plugin";
import { curveStep, curveMonotoneX, curveLinear, CurveFactory } from "d3-shape";
import { ConnectionPathPlugin } from "rete-connection-path-plugin";

type Schemes = GetSchemes<ClassicPreset.Node, Connection>;
type AreaExtra = ReactArea2D<any>;

class Connection extends ClassicPreset.Connection<
  ClassicPreset.Node,
  ClassicPreset.Node
> {
  curve?: CurveFactory;
}

export async function createEditor(container: HTMLElement) {
  const socket = new ClassicPreset.Socket("socket");

  const editor = new NodeEditor<Schemes>();
  const area = new AreaPlugin<Schemes, AreaExtra>(container);
  const connection = new ConnectionPlugin<Schemes, AreaExtra>();
  const render = new ReactPlugin<Schemes, AreaExtra>({ createRoot });

  const pathPlugin = new ConnectionPathPlugin<Schemes, Area2D<Schemes>>({
    curve: (c) => c.curve || curveStep,
    // transformer: () => Transformers.classic({ vertical: false }),
    arrow: () => true
  });

  // @ts-ignore
  render.use(pathPlugin);

  AreaExtensions.selectableNodes(area, AreaExtensions.selector(), {
    accumulating: AreaExtensions.accumulateOnCtrl()
  });

  render.addPreset(Presets.classic.setup());

  connection.addPreset(ConnectionPresets.classic.setup());

  editor.use(area);
  area.use(connection);
  area.use(render);

  AreaExtensions.simpleNodesOrder(area);

  const a = new ClassicPreset.Node("A");
  a.addOutput("a1", new ClassicPreset.Output(socket));
  a.addOutput("a2", new ClassicPreset.Output(socket));
  await editor.addNode(a);

  const b = new ClassicPreset.Node("B");
  b.addInput("b1", new ClassicPreset.Input(socket));
  b.addInput("b2", new ClassicPreset.Input(socket));
  await editor.addNode(b);

  const conn1 = new Connection(a, "a1", b, "b1");
  const conn2 = new Connection(a, "a2", b, "b2");

  conn1.curve = curveMonotoneX;
  conn2.curve = curveLinear;

  await editor.addConnection(conn1);
  await editor.addConnection(conn2);

  await area.translate(a.id, { x: 0, y: 0 });
  await area.translate(b.id, { x: 300, y: 100 });

  setTimeout(() => {
    AreaExtensions.zoomAt(area, editor.getNodes());
  }, 100);

  return {
    destroy: () => area.destroy()
  };
}
