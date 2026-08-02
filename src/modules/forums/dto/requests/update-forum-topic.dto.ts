import { PartialType } from '@nestjs/swagger';
import { CreateForumTopicDto } from './create-forum-topic.dto';

export class UpdateForumTopicDto extends PartialType(CreateForumTopicDto) {}
