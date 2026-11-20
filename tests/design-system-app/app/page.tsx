import { Button, Select, TextInput, Textarea, buttonClassName } from "../../../app/components/design-system/primitives";

export default function ServerPage() {
  return (
    <form>
      <TextInput label="Email" name="email" hint="Służbowy adres" />
      <Select label="Język" name="locale" defaultValue="pl">
        <option value="en">EN</option>
        <option value="pl">PL</option>
      </Select>
      <Textarea label="Notatka" name="note" />
      <Button type="submit">Zapisz</Button>
      <a href="/interactive" className={buttonClassName("quiet")}>Dalej</a>
    </form>
  );
}
