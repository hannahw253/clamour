"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PhotoPicker } from "@/prototype/PhotoPicker";
import { addIssue, entry, findGroup, useStore } from "@/prototype/store";
import { CATEGORY_LABEL, type Category, type Photo } from "@/prototype/types";
import { Button, Field, Loading, PageTitle, SafetyBanner, inputClass, label, safetyKind } from "@/prototype/ui";

export default function AddIssue() {
  const { gid } = useParams<{ gid: string }>();
  const router = useRouter();
  const s = useStore();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [room, setRoom] = useState("");
  const [error, setError] = useState<string>();

  if (!s) return <Loading />;
  const group = findGroup(s, gid);
  if (!group) return null;

  const safety = safetyKind(category, title);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Write one line about what's wrong");
      return;
    }
    const now = new Date().toISOString();
    const id = addIssue(group.id, {
      title,
      category: category || "other",
      room,
      entries: photos.map((photo) => entry({ kind: "photo", at: now, photo, text: photo.alt || undefined })),
    });
    router.replace(`/prototype/g/${group.id}/i/${id}?new=1`);
  };

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 pt-5 pb-8">
      {safety ? <SafetyBanner kind={safety} /> : null}
      <PageTitle sub="A photo and one line is enough. You can add more later.">Log a problem</PageTitle>

      <form onSubmit={submit} noValidate className="desk-flow flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <p className={label}>Photos</p>
          <PhotoPicker photos={photos} onChange={setPhotos} />
        </div>

        <Field id="title" title="What's wrong?" error={error} help="In your own words, like you'd say it in the group chat.">
          <input
            id="title"
            className={inputClass}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError(undefined);
            }}
            placeholder="Mould on the bathroom ceiling"
            aria-invalid={!!error}
            maxLength={120}
          />
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className={`${label} mb-2`}>What kind of problem? (optional)</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
              <label
                key={c}
                className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border-2 px-4 text-[15px] font-bold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${
                  category === c ? "border-line bg-ink text-paper" : "border-line-subtle bg-paper text-ink"
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={c}
                  checked={category === c}
                  onChange={() => setCategory(c)}
                  className="sr-only"
                />
                {CATEGORY_LABEL[c]}
              </label>
            ))}
          </div>
        </fieldset>

        <Field id="room" title="Where is it? (optional)" help={group.type === "house" ? "The room." : "Your flat and the room."}>
          <input
            id="room"
            className={inputClass}
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder={group.type === "house" ? "Bathroom" : "Flat 3, bathroom"}
          />
        </Field>

        <Button type="submit" variant="primary" className="desk-span">
          Save problem
        </Button>
      </form>
    </main>
  );
}
