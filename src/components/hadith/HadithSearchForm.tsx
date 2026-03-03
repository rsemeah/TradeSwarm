export function HadithSearchForm(props: {
  q?: string
  collection?: string
  topic?: string
}) {
  return (
    <form className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-3" action="/modules/hadith/search">
      <input
        name="q"
        defaultValue={props.q}
        placeholder="Keyword (Arabic or English)"
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <input
        name="collection"
        defaultValue={props.collection}
        placeholder="Collection slug (e.g. sahih-al-bukhari)"
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <input
        name="topic"
        defaultValue={props.topic}
        placeholder="Topic tag"
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <div className="md:col-span-3 flex justify-end">
        <button type="submit" className="rounded-md bg-accent px-4 py-2 text-xs font-semibold text-black">
          Search
        </button>
      </div>
    </form>
  )
}
