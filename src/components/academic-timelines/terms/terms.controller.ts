import { Controller, Get, Post, Body, Param, Patch, Delete, HttpStatus } from '@nestjs/common';
import { TermsService } from './terms.service';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { ManyTermsResult, TermMessages, TermResult } from './results';

@Controller('terms')
@ApiTags('Terms')
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Post()
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: TermResult,
    description: TermMessages.SUCCESS.TERM_CREATED_SUCCESSFULLY,
  })
  async create(@Body() data: CreateTermDto) {
    const term = await this.termsService.createTerm(data);

    return TermResult.from(term, {
      status: HttpStatus.CREATED,
      message: TermMessages.SUCCESS.TERM_CREATED_SUCCESSFULLY,
    });
  }

  @Get()
  async findAll() {
    const terms = await this.termsService.getAllTerms();

    return ManyTermsResult.from(terms, {
      status: HttpStatus.OK,
      message: TermMessages.SUCCESS.TERM_FETCHED_SUCCESSFULLY,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const term = await this.termsService.getTermById(id);

    return TermResult.from(term, {
      status: HttpStatus.OK,
      message: TermMessages.SUCCESS.TERM_FETCHED_SUCCESSFULLY,
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: UpdateTermDto) {
    const term = await this.termsService.updateTerm(id, data);

    return TermResult.from(term, {
      status: HttpStatus.OK,
      message: TermMessages.SUCCESS.TERM_UPDATED_SUCCESSFULLY,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const term = await this.termsService.deleteTerm(id);

    return TermResult.from(term, {
      status: HttpStatus.OK,
      message: TermMessages.SUCCESS.TERM_DELETED_SUCCESSFULLY,
    });
  }

  @Patch(':id/set-current')
  async setCurrent(@Param('id') id: string) {
    const term = await this.termsService.setCurrentTerm(id);

    return TermResult.from(term, {
      status: HttpStatus.OK,
      message: TermMessages.SUCCESS.TERM_UPDATED_SUCCESSFULLY,
    });
  }

}
