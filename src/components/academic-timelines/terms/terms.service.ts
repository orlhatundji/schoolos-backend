import { Injectable, NotFoundException } from '@nestjs/common';
import { TermsRepository } from './terms.repository';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { TermMessages } from './results/messages';
import { Term } from './types';
import { BaseService } from '../../../common/base-service';

@Injectable()
export class TermsService extends BaseService {
  constructor(private readonly termsRepository: TermsRepository) {
    super(TermsService.name);
  }

  async createTerm(data: CreateTermDto): Promise<Term> {
    return this.termsRepository.create(data);
  }

  async getAllTerms(): Promise<Term[]> {
    return this.termsRepository.findAll();
  }

  async getTermById(id: string): Promise<Term> {
    const term = await this.termsRepository.findById(id);
    if (!term) {
      throw new NotFoundException(TermMessages.FAILURE.TERM_NOT_FOUND);
    }
    return term;
  }

  async updateTerm(id: string, data: UpdateTermDto): Promise<Term> {
    return this.termsRepository.update({ id }, data);
  }

  async deleteTerm(id: string): Promise<Term> {
    return this.termsRepository.delete({ id });
  }
}
