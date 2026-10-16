// A tour of TSX: TypeScript with JSX markup (React-style components).
import { useState } from 'react';

interface Props {
  title: string;
  items?: string[];
}

export function List({ title, items = [] }: Props) {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <section className="list" onClick={() => setOpen(!open)}>
      <h2>{title} – héllo 👋</h2>
      {open && (
        <>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </>
      )}
      <br />
    </section>
  );
}
