// file: client/src/components/contacts/ContactForm.tsx
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";

export interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  note: string;
  invoiceName: string;
  invoiceEmail: string;
  invoicePhone: string;
  invoiceIc: string;
  invoiceDic: string;
  clientComeFrom: string;
  billingStreet: string;
  billingCity: string;
  billingZip: string;
  billingCountry: string;
}

export default function ContactForm({
  form,
  setForm,
}: {
  form: ContactFormData;
  setForm: (f: ContactFormData) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label>Jméno</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Jméno a příjmení"
        />
      </div>
      <div>
        <Label>Firma</Label>
        <Input
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
          placeholder="Název firmy"
        />
      </div>
      <div>
        <Label>Email</Label>
        <Input
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="email@example.com"
        />
      </div>
      <div>
        <Label>Telefon</Label>
        <Input
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+420 ..."
        />
      </div>

      <div>
        <Label>IČO</Label>
        <Input
          value={form.invoiceIc}
          onChange={(e) => setForm({ ...form, invoiceIc: e.target.value })}
          placeholder="IČO"
        />
      </div>
      <div>
        <Label>DIČ</Label>
        <Input
          value={form.invoiceDic}
          onChange={(e) => setForm({ ...form, invoiceDic: e.target.value })}
          placeholder="DIČ"
        />
      </div>
      <div>
        <Label>Fakturační jméno</Label>
        <Input
          value={form.invoiceName}
          onChange={(e) => setForm({ ...form, invoiceName: e.target.value })}
          placeholder="Fakturační jméno"
        />
      </div>
      <div>
        <Label>Fakturační email</Label>
        <Input
          value={form.invoiceEmail}
          onChange={(e) => setForm({ ...form, invoiceEmail: e.target.value })}
          placeholder="fakturace@example.com"
        />
      </div>
      <div>
        <Label>Fakturační telefon</Label>
        <Input
          value={form.invoicePhone}
          onChange={(e) => setForm({ ...form, invoicePhone: e.target.value })}
          placeholder="+420 ..."
        />
      </div>
      <div>
        <Label>Zdroj (odkud přišel)</Label>
        <Input
          value={form.clientComeFrom}
          onChange={(e) => setForm({ ...form, clientComeFrom: e.target.value })}
          placeholder="např. web, partner..."
        />
      </div>

      <div className="md:col-span-2 pt-2">
        <div className="text-sm font-medium mb-1">Fakturační adresa</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Ulice a číslo</Label>
            <Input
              value={form.billingStreet}
              onChange={(e) => setForm({ ...form, billingStreet: e.target.value })}
              placeholder="Ulice 1"
            />
          </div>
          <div>
            <Label>Město</Label>
            <Input
              value={form.billingCity}
              onChange={(e) => setForm({ ...form, billingCity: e.target.value })}
              placeholder="Praha"
            />
          </div>
          <div>
            <Label>PSČ</Label>
            <Input
              value={form.billingZip}
              onChange={(e) => setForm({ ...form, billingZip: e.target.value })}
              placeholder="11000"
            />
          </div>
          <div>
            <Label>Země</Label>
            <Input
              value={form.billingCountry}
              onChange={(e) => setForm({ ...form, billingCountry: e.target.value })}
              placeholder="Česká republika"
            />
          </div>
        </div>
      </div>

      <div className="md:col-span-2">
        <Label>Poznámka</Label>
        <Input
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          placeholder="Poznámky"
        />
      </div>
    </div>
  );
}
