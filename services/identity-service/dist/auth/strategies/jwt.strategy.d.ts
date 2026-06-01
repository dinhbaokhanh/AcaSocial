import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../../users/user.entity';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private userRepo;
    private redis;
    constructor(config: ConfigService, userRepo: Repository<User>);
    validate(req: any, payload: {
        sub: string;
        jti: string;
        email: string;
    }): Promise<{
        jti: string;
        id: string;
        fullName: string;
        dateOfBirth: Date;
        email: string;
        passwordHash: string;
        avatarUrl: string;
        privacy: import("../../users/user.entity").Privacy;
        isVerified: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date;
        refreshTokens: import("../../users/refresh-token.entity").RefreshToken[];
    }>;
}
export {};
