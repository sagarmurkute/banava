export function generatePolygonPoints(
  width: number,
  height: number,
  pointsCount: number = 3,
  isStar: boolean = false,
  starRatio: number = 0.5
): string {
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2;
  const ry = height / 2;

  const totalPoints = isStar ? pointsCount * 2 : pointsCount;
  const coords: string[] = [];

  for (let i = 0; i < totalPoints; i++) {
    const angle = (i * 2 * Math.PI) / totalPoints - Math.PI / 2;
    const isInner = isStar && i % 2 === 1;
    const currentRx = isInner ? rx * starRatio : rx;
    const currentRy = isInner ? ry * starRatio : ry;

    const x = cx + currentRx * Math.cos(angle);
    const y = cy + currentRy * Math.sin(angle);
    coords.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }

  return coords.join(' ');
}
