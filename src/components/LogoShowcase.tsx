import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SmartLogo from "@/components/ui/smart-logo";
import ResponsiveLogo from "@/components/ui/responsive-logo";
import { useLogoStatus } from "@/components/ui/smart-logo";
import { useResponsiveLogoStatus } from "@/components/ui/responsive-logo";

const LogoShowcase = () => {
  const logoStatus = useLogoStatus();
  const responsiveStatus = useResponsiveLogoStatus();

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">BuildDesk Logo Showcase</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Demonstrating the intelligent logo fallback system with multiple image
          sources and responsive design.
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Logo Status
              <Badge
                variant={
                  logoStatus === "remote"
                    ? "default"
                    : logoStatus === "local"
                    ? "secondary"
                    : "outline"
                }
              >
                {logoStatus}
              </Badge>
            </CardTitle>
            <CardDescription>Current image loading status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Remote URL:</span>
                <span
                  className={
                    logoStatus === "remote" ? "text-green-600" : "text-gray-500"
                  }
                >
                  {logoStatus === "remote" ? "✓ Available" : "✗ Failed"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Local Image:</span>
                <span
                  className={
                    logoStatus === "local" ? "text-green-600" : "text-gray-500"
                  }
                >
                  {logoStatus === "local" ? "✓ Available" : "✗ Failed"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Text Fallback:</span>
                <span
                  className={
                    logoStatus === "text" ? "text-blue-600" : "text-gray-500"
                  }
                >
                  {logoStatus === "text" ? "✓ Active" : "Ready"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Responsive Status
              <Badge
                variant={
                  responsiveStatus.device === "mobile" ? "default" : "secondary"
                }
              >
                {responsiveStatus.device}
              </Badge>
            </CardTitle>
            <CardDescription>Device-specific logo handling</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Device Type:</span>
                <span className="font-medium">{responsiveStatus.device}</span>
              </div>
              <div className="flex justify-between">
                <span>Image State:</span>
                <span className="font-medium">{responsiveStatus.state}</span>
              </div>
              <div className="flex justify-between">
                <span>Remote Source:</span>
                <span className="text-xs text-gray-500">Supabase</span>
              </div>
              <div className="flex justify-between">
                <span>Local Source:</span>
                <span className="text-xs text-gray-500">Public folder</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Basic Logo Variations */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Logo Variations</CardTitle>
          <CardDescription>
            Standard SmartLogo component with different configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Remote Priority */}
            <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg">
              <SmartLogo size="md" priority="remote" />
              <Badge variant="outline">Remote Priority</Badge>
              <p className="text-xs text-gray-500 text-center">
                Tries Supabase URL first, then local, then text
              </p>
            </div>

            {/* Local Priority */}
            <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg">
              <SmartLogo size="md" priority="local" />
              <Badge variant="outline">Local Priority</Badge>
              <p className="text-xs text-gray-500 text-center">
                Tries local image first, then text
              </p>
            </div>

            {/* Text Only */}
            <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg">
              <SmartLogo size="md" showText={true} />
              <Badge variant="outline">Text Only</Badge>
              <p className="text-xs text-gray-500 text-center">
                Forces text rendering with brand styling
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Size Variations */}
      <Card>
        <CardHeader>
          <CardTitle>Size Variations</CardTitle>
          <CardDescription>
            Different logo sizes for various use cases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {["sm", "md", "lg", "xl"].map((size) => (
              <div
                key={size}
                className="flex flex-col items-center space-y-2 p-4 border rounded-lg"
              >
                <SmartLogo size={size as "sm" | "md" | "lg" | "xl"} />
                <Badge variant="outline">{size.toUpperCase()}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Text Fallback Variations */}
      <Card>
        <CardHeader>
          <CardTitle>Text Fallback Variations</CardTitle>
          <CardDescription>
            Styled text fallbacks for different backgrounds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Light Background */}
            <div className="p-6 bg-white border rounded-lg">
              <h4 className="font-semibold mb-4">Light Background</h4>
              <div className="flex items-center gap-8 flex-wrap">
                <SmartLogo size="sm" showText={true} />
                <SmartLogo size="md" showText={true} />
                <SmartLogo size="lg" showText={true} />
              </div>
            </div>

            {/* Dark Background */}
            <div className="p-6 bg-construction-dark rounded-lg">
              <h4 className="font-semibold mb-4 text-white">Dark Background</h4>
              <div className="flex items-center gap-8 flex-wrap">
                <SmartLogo
                  size="sm"
                  showText={true}
                  textClassName="text-white"
                />
                <SmartLogo
                  size="md"
                  showText={true}
                  textClassName="text-white"
                />
                <SmartLogo
                  size="lg"
                  showText={true}
                  textClassName="text-white"
                />
              </div>
            </div>

            {/* Gradient Background */}
            <div className="p-6 bg-gradient-to-r from-construction-orange/10 to-construction-blue/10 rounded-lg">
              <h4 className="font-semibold mb-4">Gradient Background</h4>
              <div className="flex items-center gap-8 flex-wrap">
                <SmartLogo size="sm" showText={true} />
                <SmartLogo size="md" showText={true} />
                <SmartLogo size="lg" showText={true} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responsive Logo Variations */}
      <Card>
        <CardHeader>
          <CardTitle>Responsive Logo Variations</CardTitle>
          <CardDescription>
            Mobile-aware logo with different configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mobile Text, Desktop Image */}
            <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg">
              <ResponsiveLogo
                mobileShowText={true}
                desktopShowText={false}
                mobileSize="sm"
                desktopSize="md"
              />
              <Badge variant="outline">Mobile Text / Desktop Image</Badge>
              <p className="text-xs text-gray-500 text-center">
                Shows text on mobile, image on desktop
              </p>
            </div>

            {/* Always Responsive Size */}
            <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg">
              <ResponsiveLogo
                mobileSize="sm"
                desktopSize="lg"
                priority="remote"
              />
              <Badge variant="outline">Responsive Sizing</Badge>
              <p className="text-xs text-gray-500 text-center">
                Small on mobile, large on desktop
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Implementation Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Examples</CardTitle>
          <CardDescription>
            How to use the logo components in your code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gray-100 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Basic Usage</h4>
              <code className="text-sm text-gray-700">
                {`<SmartLogo size="md" linkTo="/" />`}
              </code>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">With Local Priority</h4>
              <code className="text-sm text-gray-700">
                {`<SmartLogo size="md" priority="local" linkTo="/" />`}
              </code>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">
                Responsive with Mobile Text
              </h4>
              <code className="text-sm text-gray-700">
                {`<ResponsiveLogo mobileShowText={true} mobileSize="sm" desktopSize="md" />`}
              </code>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Dark Background</h4>
              <code className="text-sm text-gray-700">
                {`<SmartLogo showText={true} textClassName="text-white" />`}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LogoShowcase;
