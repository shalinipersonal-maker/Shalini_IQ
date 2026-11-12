export type ElType = "text" | "rect" | "ellipse" | "star" | "image";
export interface El {
  id: string;
  type: ElType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  // text
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontStyle?: "normal" | "bold" | "italic" | "italic bold";
  align?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
  // image
  src?: string;
  crop?: { l: number; t: number; r: number; b: number }; // fractions trimmed from each edge
  /** Marks a slot the user is expected to replace with a real product photo. */
  placeholder?: boolean;
}
export interface Doc { width: number; height: number; background: string; els: El[] }
export interface CreativeProject {
  id: string;
  name: string;
  clientId: string;
  category: string;
  placement: string;
  doc: Doc;
  thumb?: string;
  createdAt: number;
  updatedAt: number;
}
