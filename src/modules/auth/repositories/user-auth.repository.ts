import { AccountStatus } from './../../../common/constants/status.enum';
import { IUserAuthRepository } from '../interfaces/user-auth-repository.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { UserAuth } from '../entities/user-auth.entity';
import { DeepPartial, Repository } from 'typeorm';
import { RESPONSE_MESSAGES } from '../../../common/constants/response-message.constant';

export class UserAuthRepository implements IUserAuthRepository {
  constructor(
    @InjectRepository(UserAuth)
    private readonly repository: Repository<UserAuth>,
  ) {}
  async findById(id: string): Promise<UserAuth | null> {
    const user = await this.repository.findOneBy({ id });
    return user;
  }
  async findByEmail(email: string): Promise<UserAuth | null> {
    const user = await this.repository.findOne({
      where: { email },
      relations: {
        user: {
          pregnancyProfiles: true,
        },
      },
    });
    return user;
  }
  async create(UserAuth: DeepPartial<UserAuth>): Promise<UserAuth> {
    const user = this.repository.create(UserAuth);
    const savedUser = await this.repository.save(user);
    return savedUser;
  }
  async save(userAuth: UserAuth): Promise<UserAuth> {
    await this.repository.save(userAuth);
    return userAuth;
  }
  async update(id: string, email: string, password: string): Promise<void> {
    const user = await this.repository.findOneBy({ id });
    if (!user) {
      throw new Error(RESPONSE_MESSAGES.AUTH_USER_INVALID);
    }
    user.email = email;
    user.password = password;
    await this.repository.save(user);
  }

  async updateStatus(id: string, status: AccountStatus): Promise<void> {
    const user = await this.repository.findOne({ where: { userId: id } });
    if (!user) {
      throw new Error(RESPONSE_MESSAGES.AUTH_USER_INVALID);
    }
    user.status = status;
    await this.repository.save(user);
  }
}
