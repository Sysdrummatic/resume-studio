import { splitTextBlocks } from "../../lib/bullet-text";

type Props = {
  text: string;
  className: string;
};

// Free-text fields (summary, education detail) show "- item" lines as the same
// .item-list bullets the experience highlights use. Prose without a bullet line
// keeps its single <p>, unchanged.
export default function BulletText({ text, className }: Props) {
  const blocks = splitTextBlocks(text);
  const only = blocks[0];
  if (blocks.length === 1 && only.kind === "paragraph") return <p className={className}>{only.text}</p>;

  return (
    <div className={`${className} bullet-text`}>
      {blocks.map((block, index) =>
        block.kind === "list" ? (
          <ul className="item-list" key={index}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={index}>{block.text}</p>
        ),
      )}
    </div>
  );
}
