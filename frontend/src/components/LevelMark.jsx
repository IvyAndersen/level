// The Level symbol ("Climb": an L whose inside rises in even steps), in one flat colour that
// follows `color`, so the screens draw it in the person's own accent. Path from the logo kit
// (symbol/level-symbol-tint.svg); at 32 px and below the kit's small cut reads better.
export default function LevelMark({ size = 56, className, style }) {
  return <svg className={className} style={style} width={size} height={size} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
    <path fill="currentColor" transform="translate(40 32)" d="M0 0H56V144H96V96H136V48H176V192H0Z" />
  </svg>
}
