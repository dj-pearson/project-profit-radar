/// <reference types="vite/client" />

// React Three Fiber JSX elements
import type { Object3DNode } from '@react-three/fiber';
import type { 
  Mesh, 
  Group, 
  BoxGeometry, 
  PlaneGeometry,
  EdgesGeometry,
  MeshStandardMaterial, 
  LineSegments, 
  LineBasicMaterial, 
  AmbientLight, 
  DirectionalLight, 
  PointLight,
  ShadowMaterial
} from 'three';

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

// Capacitor module declarations
declare module '@capacitor/camera';
declare module '@capacitor/geolocation';
declare module '@capacitor/device';
declare module '@capacitor/filesystem';
declare module '@capacitor/preferences';
declare module '@capacitor/local-notifications';
declare module '@capacitor/push-notifications';
declare module '@capacitor/core';
