import { useKitPiece, type KitPieceName, type KitTint } from "./kit";

export type KitPieceProps = {
  name: KitPieceName;
  tint?: KitTint;
} & Omit<React.ComponentProps<"group">, "ref">;

/** Una pieza del kit colocada en el mundo. */
export function KitPiece({ name, tint, ...props }: KitPieceProps) {
  const object = useKitPiece(name, tint);
  return <primitive object={object} {...props} />;
}
