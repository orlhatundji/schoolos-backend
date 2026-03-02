import { Controller, Get, Post, Body, Param, Patch, Delete, HttpStatus, Req } from '@nestjs/common';
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
  async create(@Body() data: CreateTermDto, @Req() req: any) {
    const term = await this.termsService.createTerm(data, req.user.schoolId);

    return TermResult.from(term, {
      status: HttpStatus.CREATED,
      message: TermMessages.SUCCESS.TERM_CREATED_SUCCESSFULLY,
    });
  }

  @Get()
  async findAll(@Req() req: any) {
    const terms = await this.termsService.getAllTerms(req.user.schoolId);

    return ManyTermsResult.from(terms, {
      status: HttpStatus.OK,
      message: TermMessages.SUCCESS.TERM_FETCHED_SUCCESSFULLY,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const term = await this.termsService.getTermById(id, req.user.schoolId);

    return TermResult.from(term, {
      status: HttpStatus.OK,
      message: TermMessages.SUCCESS.TERM_FETCHED_SUCCESSFULLY,
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: UpdateTermDto, @Req() req: any) {
    const term = await this.termsService.updateTerm(id, data, req.user.schoolId);

    return TermResult.from(term, {
      status: HttpStatus.OK,
      message: TermMessages.SUCCESS.TERM_UPDATED_SUCCESSFULLY,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const term = await this.termsService.deleteTerm(id, req.user.schoolId);

    return TermResult.from(term, {
      status: HttpStatus.OK,
      message: TermMessages.SUCCESS.TERM_DELETED_SUCCESSFULLY,
    });
  }

  @Patch(':id/set-current')
  async setCurrent(@Param('id') id: string, @Req() req: any) {
    const term = await this.termsService.setCurrentTerm(req.user.schoolId, id);

    return TermResult.from(term, {
      status: HttpStatus.OK,
      message: TermMessages.SUCCESS.TERM_UPDATED_SUCCESSFULLY,
    });
  }

  @Patch(':id/lock')
  async lockTerm(@Param('id') id: string, @Req() req: any) {
    const term = await this.termsService.lockTerm(id, req.user.schoolId);

    return TermResult.from(term, {
      status: HttpStatus.OK,
      message: 'Term locked successfully',
    });
  }

  @Patch(':id/unlock')
  async unlockTerm(@Param('id') id: string, @Req() req: any) {
    const term = await this.termsService.unlockTerm(id, req.user.schoolId);

    return TermResult.from(term, {
      status: HttpStatus.OK,
      message: 'Term unlocked successfully',
    });
  }

}
