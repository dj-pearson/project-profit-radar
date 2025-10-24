import { Object3DNode } from '@react-three/fiber';
import { Mesh, Group, BoxGeometry, MeshStandardMaterial, LineSegments, LineBasicMaterial, AmbientLight, DirectionalLight, PointLight, PlaneGeometry, ShadowMaterial, EdgesGeometry } from 'three';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: Object3DNode<Group, typeof Group>;
      mesh: Object3DNode<Mesh, typeof Mesh>;
      lineSegments: Object3DNode<LineSegments, typeof LineSegments>;
      boxGeometry: Object3DNode<BoxGeometry, typeof BoxGeometry>;
      planeGeometry: Object3DNode<PlaneGeometry, typeof PlaneGeometry>;
      edgesGeometry: Object3DNode<EdgesGeometry, typeof EdgesGeometry>;
      meshStandardMaterial: Object3DNode<MeshStandardMaterial, typeof MeshStandardMaterial>;
      lineBasicMaterial: Object3DNode<LineBasicMaterial, typeof LineBasicMaterial>;
      shadowMaterial: Object3DNode<ShadowMaterial, typeof ShadowMaterial>;
      ambientLight: Object3DNode<AmbientLight, typeof AmbientLight>;
      directionalLight: Object3DNode<DirectionalLight, typeof DirectionalLight>;
      pointLight: Object3DNode<PointLight, typeof PointLight>;
    }
  }
}
