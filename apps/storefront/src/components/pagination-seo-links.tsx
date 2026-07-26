/** Real `<link rel="prev|next">` for paginated catalog landings. */
export function PaginationSeoLinks({
  prev,
  next,
}: {
  prev?: string;
  next?: string;
}) {
  if (!prev && !next) {
    return null;
  }
  return (
    <>
      {prev ? <link rel="prev" href={prev} /> : null}
      {next ? <link rel="next" href={next} /> : null}
    </>
  );
}
