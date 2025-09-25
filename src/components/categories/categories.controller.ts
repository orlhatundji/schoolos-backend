import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { GetCurrentUserId } from '../../common/decorators';
import { StrategyEnum } from '../auth/strategies';
import { AccessTokenGuard } from '../auth/strategies/jwt/guards';
import { CheckPolicies, PoliciesGuard } from '../roles-manager';
import { ManageStudentPolicyHandler } from '../students/policies';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateCategoryResult, DeleteCategoryResult, UpdateCategoryResult, CategoriesListResult } from './results/category.result';
import { CategoriesService } from './categories.service';
import {
  CreateCategorySwagger,
  DeleteCategorySwagger,
  UpdateCategorySwagger,
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

  @Put(':categoryId')
  @UpdateCategorySwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async updateCategory(
    @GetCurrentUserId() userId: string,
    @Param('categoryId') categoryId: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const data = await this.categoriesService.updateCategory(userId, categoryId, updateCategoryDto);
    return new UpdateCategoryResult(data);
  }

  @Delete(':categoryId')
  @DeleteCategorySwagger()
  @CheckPolicies(new ManageStudentPolicyHandler())
  async deleteCategory(@GetCurrentUserId() userId: string, @Param('categoryId') categoryId: string) {
    const data = await this.categoriesService.deleteCategory(userId, categoryId);
    return new DeleteCategoryResult();
  }
}
