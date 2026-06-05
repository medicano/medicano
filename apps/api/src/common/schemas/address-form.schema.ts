import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

// Endereço estruturado preenchido via CEP no frontend (componente CepAddressFields).
// Campos batem 1:1 com o AddressValue do front. Tudo opcional: é a fonte para
// reidratar o formulário no Settings; os campos derivados que o restante do
// sistema usa (addressText/lat/lng na clínica, city na busca) são calculados a
// partir daqui no backend.
@Schema({ _id: false })
export class AddressForm {
  @Prop({ type: String }) cep?: string;
  @Prop({ type: String }) street?: string;
  @Prop({ type: String }) number?: string;
  @Prop({ type: String }) complement?: string;
  @Prop({ type: String }) neighborhood?: string;
  @Prop({ type: String }) city?: string;
  @Prop({ type: String }) state?: string;
  @Prop({ type: String }) reference?: string;
}

export const AddressFormSchema = SchemaFactory.createForClass(AddressForm);
