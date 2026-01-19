'use client';

import { 
  Button, 
  Card, CardHeader, CardBody, CardFooter,
  Input,
  Avatar,
  Chip,
  Progress
} from "@heroui/react";
import { Heart, Star, Mail } from "lucide-react";

export default function TestHeroUIPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎨 HeroUI Teste - Tema Azul Light
          </h1>
          <p className="text-gray-600">
            Componentes modernos e minimalistas
          </p>
        </div>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold">Botões</h3>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-4">
              <Button color="primary" variant="solid">
                Primary Solid
              </Button>
              <Button color="primary" variant="flat">
                Primary Flat
              </Button>
              <Button color="primary" variant="bordered">
                Primary Bordered
              </Button>
              <Button color="primary" variant="light">
                Primary Light
              </Button>
              <Button color="primary" variant="ghost">
                Primary Ghost
              </Button>
              <Button color="primary" isIconOnly>
                <Heart className="w-5 h-5" />
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex gap-3">
              <Avatar 
                icon={<Star className="w-5 h-5" />} 
                classNames={{
                  base: "bg-primary-100",
                  icon: "text-primary-600"
                }}
              />
              <div className="flex flex-col">
                <p className="text-md font-semibold">Estatística 1</p>
                <p className="text-small text-default-500">Descrição</p>
              </div>
            </CardHeader>
            <CardBody>
              <p className="text-3xl font-bold text-primary-600">2,847</p>
              <p className="text-sm text-default-500 mt-1">Total de usuários</p>
            </CardBody>
            <CardFooter>
              <Chip color="success" variant="flat" size="sm">
                +12% este mês
              </Chip>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="flex gap-3">
              <Avatar 
                icon={<Mail className="w-5 h-5" />} 
                classNames={{
                  base: "bg-success-100",
                  icon: "text-success-600"
                }}
              />
              <div className="flex flex-col">
                <p className="text-md font-semibold">Estatística 2</p>
                <p className="text-small text-default-500">Descrição</p>
              </div>
            </CardHeader>
            <CardBody>
              <p className="text-3xl font-bold text-success-600">1,523</p>
              <p className="text-sm text-default-500 mt-1">Usuários ativos</p>
            </CardBody>
            <CardFooter>
              <Chip color="primary" variant="flat" size="sm">
                Em tempo real
              </Chip>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="flex gap-3">
              <Avatar 
                icon={<Heart className="w-5 h-5" />} 
                classNames={{
                  base: "bg-danger-100",
                  icon: "text-danger-600"
                }}
              />
              <div className="flex flex-col">
                <p className="text-md font-semibold">Estatística 3</p>
                <p className="text-small text-default-500">Descrição</p>
              </div>
            </CardHeader>
            <CardBody>
              <p className="text-3xl font-bold text-danger-600">87%</p>
              <p className="text-sm text-default-500 mt-1">Taxa de sucesso</p>
            </CardBody>
            <CardFooter>
              <Chip color="warning" variant="flat" size="sm">
                Atenção
              </Chip>
            </CardFooter>
          </Card>
        </div>

        {/* Inputs */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold">Inputs</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              type="email"
              label="Email"
              placeholder="Digite seu email"
              variant="bordered"
            />
            <Input
              type="text"
              label="Nome"
              placeholder="Digite seu nome"
              variant="flat"
            />
            <Input
              type="password"
              label="Senha"
              placeholder="Digite sua senha"
              variant="faded"
            />
          </CardBody>
        </Card>

        {/* Progress */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold">Progress Bars</h3>
          </CardHeader>
          <CardBody className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Progresso Geral</span>
                <span className="text-sm font-semibold">75%</span>
              </div>
              <Progress 
                value={75} 
                color="primary"
                size="md"
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Conclusão</span>
                <span className="text-sm font-semibold">90%</span>
              </div>
              <Progress 
                value={90} 
                color="success"
                size="md"
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Performance</span>
                <span className="text-sm font-semibold">45%</span>
              </div>
              <Progress 
                value={45} 
                color="warning"
                size="md"
              />
            </div>
          </CardBody>
        </Card>

        {/* Chips */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold">Chips / Badges</h3>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-3">
              <Chip color="primary" variant="solid">Primary</Chip>
              <Chip color="success" variant="solid">Success</Chip>
              <Chip color="warning" variant="solid">Warning</Chip>
              <Chip color="danger" variant="solid">Danger</Chip>
              <Chip color="secondary" variant="solid">Secondary</Chip>
              <Chip color="default" variant="solid">Default</Chip>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              <Chip color="primary" variant="flat">Primary Flat</Chip>
              <Chip color="success" variant="flat">Success Flat</Chip>
              <Chip color="warning" variant="flat">Warning Flat</Chip>
              <Chip color="danger" variant="flat">Danger Flat</Chip>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              <Chip color="primary" variant="bordered">Primary Bordered</Chip>
              <Chip color="success" variant="bordered">Success Bordered</Chip>
              <Chip color="warning" variant="bordered">Warning Bordered</Chip>
              <Chip color="danger" variant="bordered">Danger Bordered</Chip>
            </div>
          </CardBody>
        </Card>

        {/* Status Final */}
        <Card className="bg-primary-50 border-primary-200">
          <CardBody className="text-center py-8">
            <h2 className="text-2xl font-bold text-primary-900 mb-2">
              ✅ HeroUI Instalado e Configurado!
            </h2>
            <p className="text-primary-700">
              Tema Azul Light • Moderno • Minimalista
            </p>
            <div className="flex justify-center gap-4 mt-6">
              <Button color="primary" size="lg">
                Começar a Usar
              </Button>
              <Button color="primary" variant="bordered" size="lg">
                Ver Documentação
              </Button>
            </div>
          </CardBody>
        </Card>

      </div>
    </div>
  );
}
