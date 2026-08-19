import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class FacebookPageAccountDto {
  @IsString()
  @MaxLength(120)
  pageId: string;

  @IsString()
  @MaxLength(255)
  pageName: string;

  @IsString()
  pageAccessToken: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  verifyToken?: string;

  @IsOptional()
  @IsBoolean()
  autoStart?: boolean;
}

export class FacebookOAuthUrlDto {
  @IsString()
  redirectUri: string;
}

export class FacebookOAuthExchangeDto {
  @IsString()
  code: string;

  @IsString()
  redirectUri: string;

  @IsString()
  state: string;
}

export class FacebookOAuthConnectDto {
  @IsString()
  sessionId: string;

  @IsString()
  pageId: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  verifyToken?: string;

  @IsOptional()
  @IsBoolean()
  autoStart?: boolean;
}
