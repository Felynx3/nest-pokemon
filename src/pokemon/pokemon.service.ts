import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreatePokemonDto } from './dto/create-pokemon.dto';
import { UpdatePokemonDto } from './dto/update-pokemon.dto';
import { isValidObjectId, Model } from 'mongoose';
import { MongoServerError } from 'mongodb';
import { Pokemon } from './entities/pokemon.entity';
import { InjectModel } from '@nestjs/mongoose';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PokemonService {
  private readonly defaultLimit: number;

  constructor(
    @InjectModel(Pokemon.name)
    private readonly pokemonModel: Model<Pokemon>,
    private readonly configService: ConfigService,
  ) {
    this.defaultLimit = this.configService.getOrThrow<number>('defaultLimit');
  }

  async create(createPokemonDto: CreatePokemonDto) {
    try {
      return await this.pokemonModel.create({
        ...createPokemonDto,
        name: createPokemonDto.name.toLocaleLowerCase(),
      });
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async createBatch(createPokemonDto: CreatePokemonDto[]) {
    try {
      return await this.pokemonModel.insertMany(
        createPokemonDto.map((dto) => ({
          ...dto,
          name: dto.name.toLocaleLowerCase(),
        })),
      );
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  findAll(paginationDto: PaginationDto) {
    const { limit = this.defaultLimit, offset = 0 } = paginationDto;

    return this.pokemonModel.find().limit(limit).skip(offset);
  }

  async findOne(search: string) {
    let pokemon: Pokemon | null;

    if (isValidObjectId(search)) {
      pokemon = await this.pokemonModel.findById(search);
    } else if (isNaN(Number(search))) {
      pokemon = await this.pokemonModel.findOne({
        name: search.toLocaleLowerCase().trim(),
      });
    } else {
      pokemon = await this.pokemonModel.findOne({ no: search });
    }

    if (!pokemon) {
      throw new NotFoundException('Pokemon not found');
    }

    return pokemon;
  }

  async update(search: string, updatePokemonDto: UpdatePokemonDto) {
    const pokemon = await this.findOne(search);

    Object.assign(pokemon, updatePokemonDto);

    try {
      await pokemon.updateOne(updatePokemonDto, {
        new: true,
      });

      return pokemon.toJSON();
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async remove(id: string) {
    const { deletedCount } = await this.pokemonModel.deleteOne({ _id: id });

    if (deletedCount === 0) {
      throw new NotFoundException('Pokemon not found');
    }

    return { message: 'Pokemon deleted successfully' };
  }

  private handleExceptions(error: any) {
    const mongoServerError = error as MongoServerError;

    if (mongoServerError.code === 11000) {
      throw new BadRequestException(
        `Pokemon already exists in db ${JSON.stringify(mongoServerError.keyValue)}`,
      );
    }

    console.error(error);
    throw new InternalServerErrorException();
  }
}
