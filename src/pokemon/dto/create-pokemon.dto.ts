import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreatePokemonDto {
  @IsInt()
  @Min(1)
  no: number;

  @IsString()
  @IsNotEmpty()
  name: string;
}
