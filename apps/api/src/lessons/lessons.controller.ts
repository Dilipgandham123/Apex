import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/auth.decorators";
import { JwtAuthGuard, RolesGuard, TenantGuard } from "../auth/auth.guards";
import { requestSchoolId } from "../auth/school";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { EndLessonDto, SearchCustomersDto, StartLessonDto } from "./lessons.dto";
import { LessonsService } from "./lessons.service";

@Controller("lessons")
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles("STAFF")
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  @Get("customers/search")
  search(@Req() request: AuthenticatedRequest, @Query() query: SearchCustomersDto) { return this.lessons.searchCustomers(requestSchoolId(request), query.query); }

  @Get("active")
  active(@Req() request: AuthenticatedRequest) { return this.lessons.active(request.auth.sub, requestSchoolId(request)); }

  @Get("history")
  history(@Req() request: AuthenticatedRequest) { return this.lessons.history(request.auth.sub, requestSchoolId(request)); }

  @Post("start")
  start(@Req() request: AuthenticatedRequest, @Body() input: StartLessonDto) { return this.lessons.start(request.auth.sub, requestSchoolId(request), input); }

  @Post(":lessonId/end")
  end(@Req() request: AuthenticatedRequest, @Param("lessonId") lessonId: string, @Body() input: EndLessonDto) { return this.lessons.end(request.auth.sub, requestSchoolId(request), lessonId, input); }
}
