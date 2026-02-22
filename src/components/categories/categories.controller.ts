import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { GetCurrentUserId } from '../../common/decorators';
import { StrategyEnum } from '../auth/strategies';
import { AccessTokenGuard } from '../auth/strategies/jwt/guards';
import { CheckPolicies, PoliciesGuard } from '../roles-manager';
import { ManageStudentPolicyHandler } from '../students/policies';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateCategoryResult, CategoriesListResult } from './results/category.result';
import { CategoriesService } from './categories.service';
import {
  CreateCategorySwagger,
  GetCategoriesSwagger,
} from './categories.swagger';

@Controller('categories')
@ApiTags('Categories')
@ApiBearerAuth(StrategyEnum.JWT)
@UseGuards(AccessTokenGuard, PoliciesGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @GetCategoriesSwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async getCategories(@GetCurrentUserId() userId: string) {
    const data = await this.categoriesService.getCategories(userId);
    return new CategoriesListResult(data);
  }

  @Post()
  @CreateCategorySwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async createCategory(
    @GetCurrentUserId() userId: string,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    const data = await this.categoriesService.createCategory(userId, createCategoryDto);
    return new CreateCategoryResult(data);
  }
}
