"use client";

export function BulletEditor({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  function updateAt(i: number, v: string) {
    const next = [...values];
    next[i] = v;
    onChange(next);
  }
  function removeAt(i: number) {
    onChange(values.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...values, ""]);
  }

  return (
    <div className="editor">
      <ul className="bullet-list">
        {values.map((v, i) => (
          <li key={i}>
            <span className="dash">—</span>
            <textarea rows={1} placeholder={placeholder} value={v} onChange={(e) => updateAt(i, e.target.value)} />
            {values.length > 1 && (
              <button type="button" className="remove-bullet" onClick={() => removeAt(i)} aria-label="Hapus poin">
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
      <button type="button" className="add-bullet" onClick={add}>
        + Tambah poin
      </button>
    </div>
  );
}
